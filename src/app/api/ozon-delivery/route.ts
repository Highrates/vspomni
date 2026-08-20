import { NextRequest, NextResponse } from 'next/server'
import { estimateOzonShipmentPackage } from '@/lib/ozonShipmentEstimate'
import type { OzonPickupPoint } from '@/types/ozonDelivery'

const OZON_API_BASE = (process.env.OZON_API_URL || 'https://xapi.ozon.ru').replace(/\/$/, '')
const INTEGRATION_PREFIX = '/principal-integration-api/v1'
const AUTH_PATH = '/principal-auth-api/connect/token'

type ShipmentLineBody = {
  quantity: number
  weight_kg?: number
  length_mm?: number
  width_mm?: number
  height_mm?: number
}

let cachedToken: string | null = null
let tokenExpiry = 0
let cachedFromPlaceId: string | null = null

function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { 'Access-Control-Allow-Origin': '*' },
  })
}

function getCredentials() {
  const clientId = process.env.OZON_CLIENT_ID?.trim()
  const clientSecret = process.env.OZON_CLIENT_SECRET?.trim()
  if (!clientId || !clientSecret) {
    throw new Error(
      'OZON_CLIENT_ID и OZON_CLIENT_SECRET не заданы. Добавьте ключи из ЛК Ozon Logistika.',
    )
  }
  return { clientId, clientSecret }
}

async function getOzonToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiry - 60_000) {
    return cachedToken
  }

  const { clientId, clientSecret } = getCredentials()
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 20_000)

  try {
    const res = await fetch(`${OZON_API_BASE}${AUTH_PATH}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
      }),
      signal: controller.signal,
      cache: 'no-store',
    })

    const text = await res.text()
    let data: { access_token?: string; expires_in?: number; message?: string; error?: string }
    try {
      data = JSON.parse(text)
    } catch {
      throw new Error(`Ozon auth: неверный ответ (${res.status})`)
    }

    if (!res.ok || !data.access_token) {
      throw new Error(
        data.message || data.error || `Ozon auth failed (${res.status})`,
      )
    }

    cachedToken = data.access_token
    tokenExpiry = Date.now() + (data.expires_in ?? 3600) * 1000
    return cachedToken
  } finally {
    clearTimeout(timeout)
  }
}

async function ozonRequest(
  path: string,
  options: {
    method?: 'GET' | 'POST'
    query?: Record<string, string | number | boolean | undefined>
    body?: unknown
  } = {},
) {
  const token = await getOzonToken()
  const url = new URL(`${OZON_API_BASE}${path}`)
  if (options.query) {
    for (const [k, v] of Object.entries(options.query)) {
      if (v !== undefined && v !== '') url.searchParams.set(k, String(v))
    }
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 25_000)

  try {
    const res = await fetch(url.toString(), {
      method: options.method || 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
      cache: 'no-store',
    })
    return res
  } finally {
    clearTimeout(timeout)
  }
}

async function parseOzonJson(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text()
  if (!text) return {}
  try {
    return JSON.parse(text) as Record<string, unknown>
  } catch {
    throw new Error(`Ozon API: неверный JSON (${res.status}): ${text.slice(0, 200)}`)
  }
}

function ozonErrorMessage(res: Response, data: Record<string, unknown>): string {
  const msg =
    (typeof data.message === 'string' && data.message) ||
    (typeof data.error === 'string' && data.error) ||
    (typeof data.title === 'string' && data.title) ||
    ''
  if (res.status === 401 || res.status === 403) {
    return 'Доступ к Ozon Logistika запрещён. Проверьте OZON_CLIENT_ID и OZON_CLIENT_SECRET.'
  }
  return msg || `Ozon API error (${res.status})`
}

function asArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[]
  return []
}

function pickString(obj: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const v = obj[k]
    if (typeof v === 'string' && v.trim()) return v.trim()
  }
  return ''
}

function normalizePickupPoint(raw: Record<string, unknown>): OzonPickupPoint | null {
  const id = raw.id ?? raw.deliveryVariantId
  if (id == null) return null

  const addressRaw =
    (raw.address as Record<string, unknown> | undefined) ||
    (raw.pickupPoint as Record<string, unknown> | undefined) ||
    {}

  const coordsRaw =
    (raw.coordinates as Record<string, unknown> | undefined) ||
    (raw.geoCoordinates as Record<string, unknown> | undefined) ||
    (addressRaw.coordinates as Record<string, unknown> | undefined)

  const lat =
    typeof coordsRaw?.lat === 'number'
      ? coordsRaw.lat
      : typeof coordsRaw?.latitude === 'number'
        ? coordsRaw.latitude
        : undefined
  const lon =
    typeof coordsRaw?.lng === 'number'
      ? coordsRaw.lng
      : typeof coordsRaw?.longitude === 'number'
        ? coordsRaw.longitude
        : undefined

  const city = pickString(addressRaw, 'city', 'settlement', 'locality')
  const region = pickString(addressRaw, 'region', 'area')
  const street = pickString(addressRaw, 'address', 'addressLine', 'street')
  const postalCode = pickString(addressRaw, 'postalCode', 'postal_code', 'zip')

  const fullAddress =
    pickString(addressRaw, 'fullAddress', 'full_address') ||
    [city, street].filter(Boolean).join(', ')

  const type =
    pickString(raw, 'objectTypeName', 'deliveryType', 'type') || 'PickPoint'

  const workingHoursRaw = raw.workingHours ?? raw.working_hours
  const workingHours =
    typeof workingHoursRaw === 'string'
      ? workingHoursRaw
      : Array.isArray(workingHoursRaw)
        ? workingHoursRaw
            .map((w) => {
              if (typeof w === 'string') return w
              if (w && typeof w === 'object') {
                const o = w as Record<string, unknown>
                return [o.days, o.hours, o.from, o.to].filter(Boolean).join(' ')
              }
              return ''
            })
            .filter(Boolean)
            .join('; ')
        : undefined

  return {
    id: String(id),
    name: pickString(raw, 'name', 'title') || fullAddress || `ПВЗ ${id}`,
    type,
    address: {
      region,
      city,
      address: street || fullAddress,
      postalCode,
      fullAddress,
    },
    workingHours,
    coordinates:
      lat != null && lon != null && Number.isFinite(lat) && Number.isFinite(lon)
        ? { latitude: lat, longitude: lon }
        : undefined,
  }
}

async function resolveFromPlaceId(): Promise<string> {
  const envId = process.env.OZON_FROM_PLACE_ID?.trim()
  if (envId) return envId
  if (cachedFromPlaceId) return cachedFromPlaceId

  const res = await ozonRequest(`${INTEGRATION_PREFIX}/delivery/from_places`)
  const data = await parseOzonJson(res)
  if (!res.ok) throw new Error(ozonErrorMessage(res, data))

  const places = asArray<Record<string, unknown>>(data.data ?? data.Data ?? data)
  const first = places[0]
  const id = first?.id ?? first?.fromPlaceId
  if (id == null) {
    throw new Error(
      'Ozon: не найден склад передачи отправлений (from_places). Укажите OZON_FROM_PLACE_ID в .env.',
    )
  }
  cachedFromPlaceId = String(id)
  return cachedFromPlaceId
}

function buildPackagesFromLines(
  lines: ShipmentLineBody[] | undefined,
  estimatedPrice: number,
) {
  if (lines?.length) {
    return lines.map((l) => {
      const qty = Math.max(1, Math.floor(l.quantity || 1))
      const pkg = estimateOzonShipmentPackage([
        {
          quantity: qty,
          weightKg: l.weight_kg,
          lengthMm: l.length_mm,
          widthMm: l.width_mm,
          heightMm: l.height_mm,
        },
      ])
      return {
        count: 1,
        dimensions: {
          weight: pkg.totalWeightG,
          length: pkg.lengthMm,
          width: pkg.widthMm,
          height: pkg.heightMm,
        },
        price: estimatedPrice,
        estimatedPrice,
      }
    })
  }

  return [
    {
      count: 1,
      dimensions: { weight: 300, length: 200, width: 200, height: 100 },
      price: estimatedPrice,
      estimatedPrice,
    },
  ]
}

function extractAmount(data: Record<string, unknown>): number {
  const candidates = [
    data.amount,
    data.Amount,
    (data.data as Record<string, unknown> | undefined)?.amount,
    (data.result as Record<string, unknown> | undefined)?.amount,
  ]
  for (const c of candidates) {
    if (typeof c === 'number' && Number.isFinite(c)) return c
    if (typeof c === 'string') {
      const n = parseFloat(c.replace(/\s/g, '').replace(',', '.'))
      if (Number.isFinite(n)) return n
    }
  }
  return 0
}

function extractDays(data: Record<string, unknown>): number | undefined {
  const candidates = [data.days, data.Days, (data.data as Record<string, unknown>)?.days]
  for (const c of candidates) {
    if (typeof c === 'number' && Number.isFinite(c)) return c
  }
  return undefined
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Record<string, unknown>
    const action = String(body.action || '')

    if (action === 'list-cities') {
      const res = await ozonRequest(`${INTEGRATION_PREFIX}/delivery/cities`)
      const data = await parseOzonJson(res)
      if (!res.ok) return json({ error: ozonErrorMessage(res, data) }, res.status)

      const raw = data.data ?? data.cities ?? data
      let cities: string[] = []
      if (Array.isArray(raw)) {
        cities = raw
          .map((c) => {
            if (typeof c === 'string') return c
            if (c && typeof c === 'object') {
              const o = c as Record<string, unknown>
              return pickString(o, 'name', 'city', 'cityName')
            }
            return ''
          })
          .filter(Boolean)
      }
      cities = [...new Set(cities)].sort((a, b) => a.localeCompare(b, 'ru'))
      return json({ cities })
    }

    if (action === 'list-variants') {
      const cityName = String(body.cityName || '').trim()
      if (!cityName) return json({ error: 'cityName обязателен' }, 400)

      const deliveryTypes = Array.isArray(body.deliveryTypes)
        ? (body.deliveryTypes as string[])
        : ['PickPoint', 'Postamat']

      const res = await ozonRequest(`${INTEGRATION_PREFIX}/delivery/variants`, {
        query: {
          cityName,
          'pagination.size': 200,
          'payloadIncludes.includeWorkingHours': true,
          'payloadIncludes.includePostalCode': true,
        },
      })
      const data = await parseOzonJson(res)
      if (!res.ok) return json({ error: ozonErrorMessage(res, data) }, res.status)

      const variants = asArray<Record<string, unknown>>(data.data ?? data.variants)
      const allowed = new Set(deliveryTypes.map((t) => t.toLowerCase()))
      const points = variants
        .map(normalizePickupPoint)
        .filter((p): p is OzonPickupPoint => {
          if (!p) return false
          const t = p.type.toLowerCase()
          if (allowed.size === 0) return true
          return (
            allowed.has(t) ||
            t.includes('pick') ||
            t.includes('postamat') ||
            t.includes('pvz')
          )
        })

      return json({ points })
    }

    if (action === 'calculate') {
      const deliveryVariantId = String(body.deliveryVariantId || '').trim()
      if (!deliveryVariantId) {
        return json({ error: 'deliveryVariantId обязателен' }, 400)
      }

      const lines = body.shipment_lines as ShipmentLineBody[] | undefined
      const estimatedPrice =
        typeof body.estimatedPrice === 'number' && body.estimatedPrice > 0
          ? body.estimatedPrice
          : 1000

      let weightG =
        typeof body.weightG === 'number' && body.weightG > 0
          ? Math.ceil(body.weightG)
          : 0

      if (!weightG && lines?.length) {
        weightG = estimateOzonShipmentPackage(
          lines.map((l) => ({
            quantity: l.quantity,
            weightKg: l.weight_kg,
            lengthMm: l.length_mm,
            widthMm: l.width_mm,
            heightMm: l.height_mm,
          })),
        ).totalWeightG
      }
      if (!weightG) weightG = 300

      const fromPlaceId = await resolveFromPlaceId()
      const res = await ozonRequest(`${INTEGRATION_PREFIX}/delivery/calculate`, {
        query: {
          deliveryVariantId,
          weight: weightG,
          fromPlaceId,
          estimatedPrice,
        },
      })
      const data = await parseOzonJson(res)
      if (!res.ok) return json({ error: ozonErrorMessage(res, data) }, res.status)

      const amount = extractAmount(data)
      if (amount <= 0) {
        return json({ error: 'Ozon не вернул стоимость доставки' }, 502)
      }
      return json({ amount: Math.round(amount), days: extractDays(data) })
    }

    if (action === 'calculate-by-address') {
      const address = String(body.address || '').trim()
      if (!address) return json({ error: 'address обязателен' }, 400)

      const lines = body.shipment_lines as ShipmentLineBody[] | undefined
      const estimatedPrice =
        typeof body.estimatedPrice === 'number' && body.estimatedPrice > 0
          ? body.estimatedPrice
          : 1000

      const fromPlaceId = await resolveFromPlaceId()
      const packages = buildPackagesFromLines(lines, estimatedPrice)

      const res = await ozonRequest(
        `${INTEGRATION_PREFIX}/delivery/calculate/information`,
        {
          method: 'POST',
          body: {
            fromPlaceId: Number(fromPlaceId) || fromPlaceId,
            address,
            packages,
          },
        },
      )
      const data = await parseOzonJson(res)
      if (!res.ok) return json({ error: ozonErrorMessage(res, data) }, res.status)

      const amount = extractAmount(data)
      if (amount <= 0) {
        return json({ error: 'Ozon не вернул стоимость доставки по адресу' }, 502)
      }
      return json({ amount: Math.round(amount), days: extractDays(data) })
    }

    return json({ error: `Unknown action: ${action}` }, 400)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Internal server error'
    console.error('[ozon-delivery]', msg)
    return json({ error: msg }, 500)
  }
}

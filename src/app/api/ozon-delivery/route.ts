import { NextRequest, NextResponse } from 'next/server'
import { orderedYandexPvzCityNames } from '@/lib/yandexCityGeo'
import { estimateOzonDeliveryRub } from '@/lib/ozonTariffEstimate'
import {
  buildOzonAuthorizeUrl,
  describeOzonAuthSetup,
  getOzonApiBase,
  getOzonAuthHeaders,
} from '@/lib/ozonSellerAuth'
import type { OzonPickupPoint } from '@/types/ozonDelivery'

type ShipmentLineBody = {
  quantity: number
  weight_kg?: number
  length_mm?: number
  width_mm?: number
  height_mm?: number
}

function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { 'Access-Control-Allow-Origin': '*' },
  })
}

async function geocodeCityCenter(cityName: string): Promise<{ lat: number; lon: number } | null> {
  try {
    const url = new URL('https://nominatim.openstreetmap.org/search')
    url.searchParams.set('q', `Россия, ${cityName}`)
    url.searchParams.set('format', 'json')
    url.searchParams.set('limit', '1')
    const res = await fetch(url.toString(), {
      headers: { 'User-Agent': 'VspomniStore/1.0' },
      cache: 'no-store',
    })
    const data = (await res.json()) as Array<{ lat?: string; lon?: string }>
    if (Array.isArray(data) && data[0]) {
      const lat = parseFloat(data[0].lat || '')
      const lon = parseFloat(data[0].lon || '')
      if (Number.isFinite(lat) && Number.isFinite(lon)) return { lat, lon }
    }
  } catch {
    // ignore
  }
  return null
}

function cityViewport(
  center: { lat: number; lon: number },
  delta = 0.35,
): Record<string, unknown> {
  return {
    left_bottom: { lat: center.lat - delta, long: center.lon - delta },
    right_top: { lat: center.lat + delta, long: center.lon + delta },
  }
}

async function ozonRequest(path: string, body: unknown = {}) {
  const headers = await getOzonAuthHeaders()
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 25_000)
  try {
    const res = await fetch(`${getOzonApiBase()}${path}`, {
      method: 'POST',
      headers: {
        ...headers,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body ?? {}),
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
    ''
  if (res.status === 401 || res.status === 403) {
    return `Доступ к Ozon Seller API запрещён (${describeOzonAuthSetup()}).`
  }
  return msg || `Ozon API error (${res.status})`
}

function formatWorkingHours(raw: unknown): string | undefined {
  if (!Array.isArray(raw) || !raw.length) return undefined
  const parts: string[] = []
  for (const day of raw) {
    if (!day || typeof day !== 'object') continue
    const d = day as Record<string, unknown>
    const date = typeof d.date === 'string' ? d.date.slice(0, 10) : ''
    const periods = Array.isArray(d.periods) ? d.periods : []
    const slots = periods
      .map((p) => {
        if (!p || typeof p !== 'object') return ''
        const pr = p as Record<string, unknown>
        const min = pr.min as Record<string, unknown> | undefined
        const max = pr.max as Record<string, unknown> | undefined
        const from = min ? `${min.hours ?? 0}:${String(min.minutes ?? 0).padStart(2, '0')}` : ''
        const to = max ? `${max.hours ?? 0}:${String(max.minutes ?? 0).padStart(2, '0')}` : ''
        return from && to ? `${from}-${to}` : ''
      })
      .filter(Boolean)
    if (date && slots.length) parts.push(`${date}: ${slots.join(', ')}`)
    else if (slots.length) parts.push(slots.join(', '))
  }
  return parts.length ? parts.slice(0, 3).join('; ') : undefined
}

function normalizePointInfo(
  mapPointId: string,
  method: Record<string, unknown>,
): OzonPickupPoint | null {
  const addressDetails =
    (method.address_details as Record<string, unknown> | undefined) || {}
  const coords = method.coordinates as Record<string, unknown> | undefined
  const lat = typeof coords?.lat === 'number' ? coords.lat : undefined
  const lon = typeof coords?.long === 'number' ? coords.long : undefined

  const city = typeof addressDetails.city === 'string' ? addressDetails.city : ''
  const region = typeof addressDetails.region === 'string' ? addressDetails.region : ''
  const street = typeof addressDetails.street === 'string' ? addressDetails.street : ''
  const house = typeof addressDetails.house === 'string' ? addressDetails.house : ''
  const fullAddress =
    (typeof method.address === 'string' && method.address) ||
    [city, street, house].filter(Boolean).join(', ')

  const deliveryType = method.delivery_type as Record<string, unknown> | undefined
  const typeName =
    (typeof deliveryType?.name === 'string' && deliveryType.name) || 'PickPoint'

  return {
    id: mapPointId,
    name: (typeof method.name === 'string' && method.name) || fullAddress || `ПВЗ ${mapPointId}`,
    type: typeName,
    address: {
      region,
      city,
      address: street || fullAddress,
      fullAddress,
    },
    workingHours: formatWorkingHours(method.working_hours),
    coordinates:
      lat != null && lon != null ? { latitude: lat, longitude: lon } : undefined,
  }
}

async function fetchMapPointIdsForCity(cityName: string): Promise<string[]> {
  const center = await geocodeCityCenter(cityName)
  if (!center) return []

  const res = await ozonRequest('/v1/delivery/map', {
    viewport: cityViewport(center),
    zoom: 10,
  })
  const data = await parseOzonJson(res)
  if (!res.ok) throw new Error(ozonErrorMessage(res, data))

  const clusters = Array.isArray(data.clusters) ? data.clusters : []
  const ids = new Set<string>()
  for (const c of clusters) {
    if (!c || typeof c !== 'object') continue
    const cluster = c as Record<string, unknown>
    const mapPointIds = cluster.map_point_ids
    if (Array.isArray(mapPointIds)) {
      for (const id of mapPointIds) {
        if (id != null && String(id).trim()) ids.add(String(id))
      }
    }
  }
  return [...ids]
}

async function fetchPickupPointsByIds(mapPointIds: string[]): Promise<OzonPickupPoint[]> {
  if (!mapPointIds.length) return []

  const res = await ozonRequest('/v1/delivery/point/info', {
    map_point_ids: mapPointIds.slice(0, 200),
  })
  const data = await parseOzonJson(res)
  if (!res.ok) throw new Error(ozonErrorMessage(res, data))

  const rawPoints = Array.isArray(data.points) ? data.points : []
  const result: OzonPickupPoint[] = []
  for (const item of rawPoints) {
    if (!item || typeof item !== 'object') continue
    const row = item as Record<string, unknown>
    if (row.enabled === false) continue
    const method = row.delivery_method as Record<string, unknown> | undefined
    if (!method) continue
    const mapPointId = method.map_point_id
    if (mapPointId == null) continue
    const point = normalizePointInfo(String(mapPointId), method)
    if (point) result.push(point)
  }
  return result
}

function shipmentLinesFromBody(body: Record<string, unknown>): ShipmentLineBody[] | undefined {
  const lines = body.shipment_lines
  if (!Array.isArray(lines)) return undefined
  return lines as ShipmentLineBody[]
}

export async function GET(req: NextRequest) {
  const action = req.nextUrl.searchParams.get('action')
  if (action === 'auth-url') {
    try {
      const url = buildOzonAuthorizeUrl()
      return json({ authorizeUrl: url, auth: describeOzonAuthSetup() })
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'auth-url failed'
      return json({ error: msg }, 500)
    }
  }
  return json({
    ok: true,
    api: 'ozon-seller',
    auth: describeOzonAuthSetup(),
    hint: 'POST {action:"list-cities"} или GET ?action=auth-url для OAuth',
  })
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Record<string, unknown>
    const action = String(body.action || '')

    if (action === 'auth-url') {
      const url = buildOzonAuthorizeUrl()
      return json({ authorizeUrl: url, auth: describeOzonAuthSetup() })
    }

    if (action === 'list-cities') {
      const cities = orderedYandexPvzCityNames()
      return json({ cities })
    }

    if (action === 'list-variants') {
      const cityName = String(body.cityName || '').trim()
      if (!cityName) return json({ error: 'cityName обязателен' }, 400)

      const mapPointIds = await fetchMapPointIdsForCity(cityName)
      const points = await fetchPickupPointsByIds(mapPointIds)

      const cityNorm = cityName.toLowerCase().replace(/ё/g, 'е')
      const filtered = points.filter((p) => {
        const c = (p.address.city || '').toLowerCase().replace(/ё/g, 'е')
        return !c || c.includes(cityNorm) || cityNorm.includes(c)
      })

      return json({ points: filtered.length ? filtered : points })
    }

    if (action === 'calculate') {
      const deliveryVariantId = String(body.deliveryVariantId || '').trim()
      if (!deliveryVariantId) {
        return json({ error: 'deliveryVariantId обязателен' }, 400)
      }

      const lines = shipmentLinesFromBody(body)
      const weightG =
        typeof body.weightG === 'number' && body.weightG > 0
          ? Math.ceil(body.weightG)
          : undefined

      const estimate = estimateOzonDeliveryRub({
        shipmentLines: lines?.map((l) => ({
          quantity: l.quantity,
          weightKg: l.weight_kg,
          lengthMm: l.length_mm,
          widthMm: l.width_mm,
          heightMm: l.height_mm,
        })),
        weightG,
        courier: false,
      })
      return json(estimate)
    }

    if (action === 'calculate-by-address') {
      const lines = shipmentLinesFromBody(body)
      const estimate = estimateOzonDeliveryRub({
        shipmentLines: lines?.map((l) => ({
          quantity: l.quantity,
          weightKg: l.weight_kg,
          lengthMm: l.length_mm,
          widthMm: l.width_mm,
          heightMm: l.height_mm,
        })),
        courier: true,
      })
      return json(estimate)
    }

    return json({ error: `Unknown action: ${action}` }, 400)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Internal server error'
    console.error('[ozon-delivery]', msg)
    if (msg.includes('OAuth') || msg.includes('Api-Key') || msg.includes('авториза')) {
      try {
        const authorizeUrl = buildOzonAuthorizeUrl()
        return json({ error: msg, authorizeUrl, auth: describeOzonAuthSetup() }, 401)
      } catch {
        return json({ error: msg, auth: describeOzonAuthSetup() }, 401)
      }
    }
    return json({ error: msg }, 500)
  }
}

import { NextRequest, NextResponse } from 'next/server'

const YANDEX_API_BASE = 'https://b2b.taxi.yandex.net'
const YANDEX_PLATFORM_API_BASE = process.env.YANDEX_DELIVERY_PLATFORM_URL || 'https://b2b-authproxy.taxi.yandex.net'
const CARGO_PATH = '/b2b/cargo/integration/v2'
const PLATFORM_PICKUP_LIST_PATH = '/api/b2b/platform/pickup-points/list'

function getToken(): string {
  const token = process.env.YANDEX_DELIVERY_TOKEN
  if (!token?.trim()) {
    throw new Error('YANDEX_DELIVERY_TOKEN is not set')
  }
  return token.trim()
}

function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { 'Access-Control-Allow-Origin': '*' },
  })
}

/** Из ответа API Яндекса достаём текст ошибки для пользователя (доставка) */
function yandexErrorToMessage(resStatus: number, err: Record<string, unknown>): string {
  const raw =
    typeof err.error === 'string'
      ? err.error
      : typeof err.message === 'string'
        ? err.message
        : typeof err.code === 'string'
          ? err.code
          : typeof err.description === 'string'
            ? err.description
            : ''
  const lower = raw.toLowerCase()
  // Ответ API: "Метод оплаты не доступен" — в ЛК доставки Яндекса не подключена оплата для B2B такси
  if (lower.includes('метод оплаты') || lower.includes('payment') && lower.includes('method')) {
    return 'В личном кабинете доставки Яндекса (dostavka.yandex.ru) подключите способ оплаты для B2B такси: Настройки → Оплата / привязка счёта.'
  }
  if (resStatus === 401 || resStatus === 403 || lower.includes('access denied') || lower.includes('forbidden') || lower.includes('unauthorized')) {
    return 'Доступ к API доставки Яндекса запрещён. Проверьте YANDEX_DELIVERY_TOKEN: токен должен быть из личного кабинета dostavka.yandex.ru (B2B такси), не OAuth.'
  }
  if (resStatus === 404 || lower.includes('not found')) {
    return 'Сервис расчёта доставки не найден. Проверьте подключение B2B такси в dostavka.yandex.ru.'
  }
  if (lower.includes('invalid') && lower.includes('token')) {
    return 'Неверный токен доставки Яндекса. Укажите корректный YANDEX_DELIVERY_TOKEN из dostavka.yandex.ru.'
  }
  if (raw) return raw
  if (resStatus === 502 || resStatus === 503) return 'Сервис доставки Яндекса временно недоступен. Попробуйте позже.'
  return 'Ошибка расчёта доставки Яндекса. Попробуйте позже или измените адрес.'
}

/** Запрос к B2B Platform API (ПВЗ и т.д.) — другой хост */
async function yandexPlatformRequest<T>(
  path: string,
  options: { method?: string; body?: unknown } = {}
): Promise<T> {
  const token = getToken()
  const url = `${YANDEX_PLATFORM_API_BASE}${path}`
  const res = await fetch(url, {
    method: options.method || 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept-Language': 'ru',
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  })
  const text = await res.text()
  if (!res.ok) {
    let err: Record<string, unknown>
    try {
      err = JSON.parse(text) as Record<string, unknown>
    } catch {
      err = { message: text || res.statusText }
    }
    console.error('Yandex Platform API raw error:', res.status, text)
    const userMsg = yandexErrorToMessage(res.status, err)
    throw new Error(userMsg)
  }
  return text ? (JSON.parse(text) as T) : ({} as T)
}

async function yandexRequest<T>(
  path: string,
  options: { method?: string; body?: unknown } = {}
): Promise<T> {
  const token = getToken()
  const url = `${YANDEX_API_BASE}${path}`
  const res = await fetch(url, {
    method: options.method || 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept-Language': 'ru',
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  })
  const text = await res.text()
  if (!res.ok) {
    let err: Record<string, unknown>
    try {
      err = JSON.parse(text) as Record<string, unknown>
    } catch {
      err = { message: text || res.statusText }
    }
    console.error('Yandex Delivery API raw error:', res.status, text)
    const userMsg = yandexErrorToMessage(res.status, err)
    throw new Error(userMsg)
  }
  return text ? (JSON.parse(text) as T) : ({} as T)
}

// Геокодирование адреса через Nominatim (бесплатно)
async function geocodeAddress(fullname: string): Promise<[number, number] | null> {
  try {
    const url = new URL('https://nominatim.openstreetmap.org/search')
    url.searchParams.set('q', fullname)
    url.searchParams.set('format', 'json')
    url.searchParams.set('limit', '1')
    const res = await fetch(url.toString(), {
      headers: { 'User-Agent': 'VspomniStore/1.0' },
    })
    const data = await res.json()
    if (Array.isArray(data) && data[0]) {
      const lon = parseFloat(data[0].lon)
      const lat = parseFloat(data[0].lat)
      if (Number.isFinite(lon) && Number.isFinite(lat)) return [lon, lat]
    }
  } catch {
    // ignore
  }
  return null
}

function getWarehousePoint(): { coordinates?: [number, number]; fullname: string; point_id?: string } {
  const lat = process.env.YANDEX_DELIVERY_WAREHOUSE_LAT
  const lng = process.env.YANDEX_DELIVERY_WAREHOUSE_LNG
  const fullname =
    process.env.YANDEX_DELIVERY_WAREHOUSE_FULLNAME || 'Россия, Санкт-Петербург, улица Ватутина 8/7Д'
  const point_id = process.env.YANDEX_DELIVERY_WAREHOUSE_ID

  if (lat && lng) {
    const lon = parseFloat(lng)
    const latN = parseFloat(lat)
    if (Number.isFinite(lon) && Number.isFinite(latN)) {
      return { coordinates: [lon, latN], fullname, point_id }
    }
  }
  // Дефолт: ПВЗ Яндекса в Санкт-Петербурге, ул. Ватутина 8/7Д
  // Поддержка сообщила об обновлении ПВЗ, используем проверенный point_id и координаты
  return {
    coordinates: [30.379738, 59.962021],
    fullname: 'Санкт-Петербург улица Ватутина 8/7Д',
    point_id: '019c55f8c0d972ea9b59302a85430825',
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    console.log('--- Yandex Delivery API Request ---', JSON.stringify(body, null, 2))
    const action = body.action as string

    if (action === 'calculate') {
      const { to, mode } = body as {
        to: {
          city: string
          street?: string
          building?: string
          fullname?: string
          coordinates?: [number, number]
        }
        mode?: 'door' | 'pvz'
      }
      const fullname =
        to.fullname ||
        [to.city, to.street, to.building].filter(Boolean).join(', ')

      const cityInput = to.city || ''
      const cityNorm = cityInput
        .trim()
        .replace(/^(МОСКВА|Москва).*$/i, 'Москва')
        .replace(/^(САНКТ-ПЕТЕРБУРГ|Санкт-Петербург).*$/i, 'Санкт-Петербург')

      let fullnameForGeocode =
        fullname
          .replace(/\s*,\s*/g, ', ')
          .replace(/^МОСКВА\b/i, 'Москва')
          .replace(/^САНКТ-ПЕТЕРБУРГ\b/i, 'Санкт-Петербург')

      console.log('--- Geocoding target ---', { fullnameForGeocode, cityNorm })

      // Если координаты уже переданы с фронта (например, для ПВЗ), используем их напрямую
      let coordinates: [number, number] | null = null
      if (Array.isArray(to.coordinates) && to.coordinates.length === 2) {
        const lon = Number(to.coordinates[0])
        const lat = Number(to.coordinates[1])
        if (Number.isFinite(lon) && Number.isFinite(lat)) {
          coordinates = [lon, lat]
        }
      }

      if (!coordinates) {
        coordinates = await geocodeAddress(fullnameForGeocode || fullname)
      }
      if (!coordinates && fullnameForGeocode && cityNorm) {
        const streetPart = (to.street || to.building || fullnameForGeocode)
          .replace(new RegExp(`^${cityNorm}\\s+`, 'i'), '')
          .trim()
        const shortAddress = streetPart ? `${cityNorm}, ${streetPart}` : cityNorm
        coordinates = await geocodeAddress(shortAddress)
      }
      if (!coordinates && fullnameForGeocode) {
        const withCountry = fullnameForGeocode.startsWith('Россия')
          ? fullnameForGeocode
          : `Россия, ${fullnameForGeocode}`
        coordinates = await geocodeAddress(withCountry)
      }
      if (!coordinates) {
        return json({
          error: 'Не удалось определить координаты адреса. Проверьте город и улицу.',
          offers: [],
        }, 200)
      }
      const warehouse = getWarehousePoint()
      const dropoffFullname =
        cityNorm && (to.street || to.building)
          ? `${cityNorm}, ${(to.street || '')
            .replace(new RegExp(`^${cityNorm}\\s+`, 'i'), '')
            .trim() || to.building}`
          : fullname
      const isPvzMode = mode === 'pvz'

      const route_points = [
        {
          id: 1,
          fullname: warehouse.fullname,
          coordinates: warehouse.coordinates,
          ...(warehouse.point_id ? { point_id: warehouse.point_id } : {})
        },
        {
          id: 2,
          coordinates,
          fullname: dropoffFullname,
          ...(isPvzMode ? { type: 'pvz' } : {})
        },
      ]
      const items = [
        {
          size: { length: 0.3, width: 0.2, height: 0.2 },
          weight: 2,
          quantity: 1,
          pickup_point: 1,
          dropoff_point: 2,
        },
      ]
      const requirements: Record<string, unknown> = {
        taxi_classes: ['express', 'courier', 'ndd', 'cargo'],
        // Для доставки до ПВЗ можно отключать услугу «до двери»
        skip_door_to_door: isPvzMode ? true : false,
        ndd: true, // Явно указываем для поддержки Яндекса
      }
      let result = await yandexRequest<{ offers: any[]; error_messages?: any[] }>(
        `${CARGO_PATH}/offers/calculate`,
        { body: { items, route_points, requirements } }
      )

      console.log('--- Yandex Delivery Offers Result ---', JSON.stringify({
        offers_count: result.offers?.length || 0,
        errors: result.error_messages
      }, null, 2))

      // Если нет офферов, пробуем более агрессивно запросить именно NDD,
      // как советовала поддержка (явная передача параметров).
      if (!result.offers?.length) {
        console.log('No offers found, retrying with explicit NDD requirements...')
        requirements.taxi_classes = ['ndd']
        requirements.ndd = true
        requirements.delivery_type = 'ndd'

        result = await yandexRequest<{ offers: any[]; error_messages?: any[] }>(
          `${CARGO_PATH}/offers/calculate`,
          { body: { items, route_points, requirements } }
        )
        console.log('--- Yandex Delivery Explicit NDD Result ---', JSON.stringify(result, null, 2))
      }

      if (!result.offers?.length) {
        // Fallback на курьера, если NDD не сработал (вдруг расстояние наоборот маленькое)
        requirements.taxi_classes = ['courier', 'express']
        delete requirements.ndd
        delete requirements.delivery_type

        result = await yandexRequest<{ offers: any[]; error_messages?: any[] }>(
          `${CARGO_PATH}/offers/calculate`,
          { body: { items, route_points, requirements } }
        )
        console.log('--- Yandex Delivery Courier Fallback Result ---', JSON.stringify(result, null, 2))
      }

      if (!result.offers?.length) {
        console.warn('Yandex offers/calculate returned empty offers after all retries', {
          dropoffFullname,
          coordinates,
          warehouse: warehouse.coordinates,
          lastError: result.error_messages
        })
        return json({
          ...result,
          error: 'По этому адресу нет доступных тарифов доставки Яндекса. Попробуйте другой адрес или выберите ПВЗ.',
          offers: result.offers || [],
        }, 200)
      }
      return json(result)
    }

    if (action === 'list-pickup-points') {
      const filters = body as {
        geo_id?: number
        type?: 'pickup_point' | 'terminal' | 'warehouse'
        longitude?: { from: number; to: number }
        latitude?: { from: number; to: number }
      }
      const requestBody: Record<string, unknown> = {}
      if (filters.geo_id != null) requestBody.geo_id = filters.geo_id
      if (filters.type) requestBody.type = filters.type
      if (filters.longitude) requestBody.longitude = filters.longitude
      if (filters.latitude) requestBody.latitude = filters.latitude
      const result = await yandexPlatformRequest<{ points: unknown[] }>(
        PLATFORM_PICKUP_LIST_PATH,
        { body: Object.keys(requestBody).length ? requestBody : {} }
      )
      return json(result)
    }

    return json({ error: 'Unknown action. Use action: "calculate" or "list-pickup-points"' }, 400)
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    console.error('Yandex Delivery API error:', message)
    // Сообщение уже может быть нашим пользовательским (из yandexErrorToMessage)
    if (message.startsWith('YANDEX_DELIVERY_TOKEN') || message.includes('dostavka.yandex') || message.includes('Проверьте') || message.includes('токен')) {
      return json({ error: message }, 400)
    }
    try {
      const err = JSON.parse(message) as Record<string, unknown>
      const msg =
        typeof err.error === 'string'
          ? err.error
          : typeof err.message === 'string'
            ? err.message
            : typeof err.code === 'string'
              ? err.code
              : message
      return json({ error: msg }, 400)
    } catch {
      return json({ error: message }, 500)
    }
  }
}

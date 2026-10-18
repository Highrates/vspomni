// ============================================
// CDEK API Service - Клиентская библиотека
// ============================================

import {
  CdekCity,
  CdekDeliveryPoint,
  CdekCalculatorRequest,
  CdekTariffListResponse,
  CdekTariffResponse,
  CdekOrderRequest,
  CdekOrderResponse,
  CdekOrderInfo,
  CdekOrderUpdateRequest,
  CdekDeleteResponse,
  CdekRefusalResponse,
  CDEK_TARIFFS,
} from '@/types/cdek'

const API_BASE = '/api/cdek/service'

// Утилиты
function getBaseUrl(): string {
  if (typeof window !== 'undefined') {
    return window.location.origin
  }
  return process.env.NEXT_PUBLIC_API_URL || ''
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error || `HTTP Error: ${response.status}`)
  }
  return response.json()
}

// ============================================
// 1. СПРАВОЧНЫЕ ДАННЫЕ (Локации)
// ============================================

/**
 * Получить список городов
 * GET /v2/location/cities
 */
export async function getCities(params?: {
  country_codes?: string
  region_code?: number
  fias_region_guid?: string
  city?: string
  postal_code?: string
  code?: number
  size?: number
  page?: number
}): Promise<CdekCity[]> {
  const url = new URL(`${getBaseUrl()}${API_BASE}`)
  url.searchParams.set('method', 'location/cities')
  
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.set(key, String(value))
      }
    })
  }

  const response = await fetch(url.toString())
  return handleResponse<CdekCity[]>(response)
}

/**
 * Получить список регионов
 * GET /v2/location/regions
 */
export async function getRegions(params?: {
  country_codes?: string
  size?: number
  page?: number
}): Promise<{ region_code: number; region: string; country_code: string; country: string }[]> {
  const url = new URL(`${getBaseUrl()}${API_BASE}`)
  url.searchParams.set('method', 'location/regions')
  
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.set(key, String(value))
      }
    })
  }

  const response = await fetch(url.toString())
  return handleResponse(response)
}

/**
 * Подсказки по городам
 * GET /v2/location/suggest/cities
 */
export async function suggestCities(query: string, countryCode = 'RU'): Promise<CdekCity[]> {
  const url = new URL(`${getBaseUrl()}${API_BASE}`)
  url.searchParams.set('method', 'location/suggest/cities')
  url.searchParams.set('name', query)
  url.searchParams.set('country_codes', countryCode)

  const response = await fetch(url.toString())
  return handleResponse<CdekCity[]>(response)
}

// ============================================
// 2. ПУНКТЫ ВЫДАЧИ
// ============================================

/**
 * Получить список пунктов выдачи
 * GET /v2/deliverypoints
 */
export async function getDeliveryPoints(params: {
  city_code?: number
  city_uuid?: string
  postal_code?: string
  type?: 'PVZ' | 'POSTAMAT' | 'ALL'
  country_code?: string
  region_code?: number
  is_handout?: boolean
  is_reception?: boolean
  is_dressing_room?: boolean
  have_cashless?: boolean
  have_cash?: boolean
  allowed_cod?: boolean
  weight_max?: number
  size?: number
  page?: number
}): Promise<CdekDeliveryPoint[]> {
  const url = new URL(`${getBaseUrl()}${API_BASE}`)
  url.searchParams.set('action', 'offices')
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      url.searchParams.set(key, String(value))
    }
  })

  const response = await fetch(url.toString())
  return handleResponse<CdekDeliveryPoint[]>(response)
}

/**
 * Получить пункты выдачи через публичное API (fallback)
 */
export async function getDeliveryPointsPublic(params: {
  latitude: number
  longitude: number
}): Promise<CdekDeliveryPoint[]> {
  const url = new URL(`${getBaseUrl()}${API_BASE}`)
  url.searchParams.set('action', 'public-offices')
  url.searchParams.set('latitude', String(params.latitude))
  url.searchParams.set('longitude', String(params.longitude))

  const response = await fetch(url.toString())
  return handleResponse<CdekDeliveryPoint[]>(response)
}

// ============================================
// 3. КАЛЬКУЛЯТОР СТОИМОСТИ ДОСТАВКИ
// ============================================

/**
 * Расчет по всем доступным тарифам
 * POST /v2/calculator/tarifflist
 */
export async function calculateTariffList(
  request: CdekCalculatorRequest
): Promise<CdekTariffListResponse> {
  const url = new URL(`${getBaseUrl()}${API_BASE}`)
  
  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      action: 'calculator/tarifflist',
      data: request,
    }),
  })

  return handleResponse<CdekTariffListResponse>(response)
}

/**
 * Расчет по конкретному тарифу
 * POST /v2/calculator/tariff
 */
export async function calculateTariff(
  request: CdekCalculatorRequest & { tariff_code: number }
): Promise<CdekTariffResponse> {
  const url = new URL(`${getBaseUrl()}${API_BASE}`)
  
  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      action: 'calculator/tariff',
      data: request,
    }),
  })

  return handleResponse<CdekTariffResponse>(response)
}

/**
 * Быстрый расчет доставки для корзины
 */
export async function calculateDelivery(params: {
  fromCityCode: number
  toCityCode: number
  weight: number // в граммах
  length?: number
  width?: number
  height?: number
  tariffCode?: number
}): Promise<{
  tariffs: CdekTariffListResponse['tariff_codes']
  cheapest?: CdekTariffListResponse['tariff_codes'][0]
  fastest?: CdekTariffListResponse['tariff_codes'][0]
}> {
  const request: CdekCalculatorRequest = {
    type: 1, // Интернет-магазин
    currency: 1, // RUB
    from_location: { code: params.fromCityCode },
    to_location: { code: params.toCityCode },
    packages: [{
      weight: params.weight,
      length: params.length || 20,
      width: params.width || 20,
      height: params.height || 10,
    }],
  }

  const result = await calculateTariffList(request)
  
  // Найти самый дешевый и самый быстрый
  const tariffs = result.tariff_codes || []
  const cheapest = tariffs.reduce((min, t) => 
    t.delivery_sum < min.delivery_sum ? t : min, tariffs[0])
  const fastest = tariffs.reduce((min, t) => 
    t.period_min < min.period_min ? t : min, tariffs[0])

  return { tariffs, cheapest, fastest }
}

// ============================================
// 4. УПРАВЛЕНИЕ ЗАКАЗАМИ
// ============================================

/**
 * Создать заказ на доставку
 * POST /v2/orders
 */
export async function createOrder(request: CdekOrderRequest): Promise<CdekOrderResponse> {
  const url = new URL(`${getBaseUrl()}${API_BASE}`)
  
  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      action: 'orders',
      data: request,
    }),
  })

  return handleResponse<CdekOrderResponse>(response)
}

/**
 * Получить информацию о заказе по UUID
 * GET /v2/orders/{uuid}
 */
export async function getOrder(uuid: string): Promise<CdekOrderInfo> {
  const url = new URL(`${getBaseUrl()}${API_BASE}`)
  url.searchParams.set('action', 'order')
  url.searchParams.set('uuid', uuid)

  const response = await fetch(url.toString())
  return handleResponse<CdekOrderInfo>(response)
}

/**
 * Получить информацию о заказе по номеру СДЭК
 * GET /v2/orders?cdek_number={cdek_number}
 */
export async function getOrderByCdekNumber(cdekNumber: string): Promise<CdekOrderInfo> {
  const url = new URL(`${getBaseUrl()}${API_BASE}`)
  url.searchParams.set('action', 'order')
  url.searchParams.set('cdek_number', cdekNumber)

  const response = await fetch(url.toString())
  return handleResponse<CdekOrderInfo>(response)
}

/**
 * Получить информацию о заказе по внутреннему номеру ИМ
 * GET /v2/orders?im_number={number}
 */
export async function getOrderByImNumber(imNumber: string): Promise<CdekOrderInfo> {
  const url = new URL(`${getBaseUrl()}${API_BASE}`)
  url.searchParams.set('action', 'order')
  url.searchParams.set('im_number', imNumber)

  const response = await fetch(url.toString())
  return handleResponse<CdekOrderInfo>(response)
}

/**
 * Изменить заказ
 * PATCH /v2/orders
 */
export async function updateOrder(request: CdekOrderUpdateRequest): Promise<CdekOrderResponse> {
  const url = new URL(`${getBaseUrl()}${API_BASE}`)
  
  const response = await fetch(url.toString(), {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      action: 'orders',
      data: request,
    }),
  })

  return handleResponse<CdekOrderResponse>(response)
}

/**
 * Удалить заказ
 * DELETE /v2/orders/{uuid}
 */
export async function deleteOrder(uuid: string): Promise<CdekDeleteResponse> {
  const url = new URL(`${getBaseUrl()}${API_BASE}`)
  url.searchParams.set('action', 'delete-order')
  url.searchParams.set('uuid', uuid)

  const response = await fetch(url.toString(), {
    method: 'DELETE',
  })

  return handleResponse<CdekDeleteResponse>(response)
}

/**
 * Зарегистрировать отказ от заказа
 * POST /v2/orders/{uuid}/refusal
 */
export async function refuseOrder(uuid: string): Promise<CdekRefusalResponse> {
  const url = new URL(`${getBaseUrl()}${API_BASE}`)
  
  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      action: 'refusal',
      uuid,
    }),
  })

  return handleResponse<CdekRefusalResponse>(response)
}

// ============================================
// 5. ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ============================================

/**
 * Создать заказ для интернет-магазина (упрощенный интерфейс)
 */
export async function createShopOrder(params: {
  orderNumber: string
  tariffCode?: number
  deliveryPointCode?: string // Код ПВЗ для самовывоза
  recipient: {
    name: string
    phone: string
    email?: string
  }
  address: {
    cityCode: number
    address: string
    postalCode?: string
  }
  items: Array<{
    name: string
    sku: string
    price: number
    weight: number // в граммах
    quantity: number
  }>
  comment?: string
}): Promise<CdekOrderResponse> {
  const totalWeight = params.items.reduce((sum, item) => sum + item.weight * item.quantity, 0)
  const totalCost = params.items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  
  const request: CdekOrderRequest = {
    type: 1, // Интернет-магазин
    number: params.orderNumber,
    tariff_code: params.tariffCode || CDEK_TARIFFS.WAREHOUSE_TO_PVZ,
    comment: params.comment,
    delivery_point: params.deliveryPointCode,
    recipient: {
      name: params.recipient.name,
      phones: [{ number: params.recipient.phone }],
      email: params.recipient.email,
    },
    to_location: {
      code: params.address.cityCode,
      address: params.address.address,
      postal_code: params.address.postalCode,
    },
    packages: [{
      number: `${params.orderNumber}-1`,
      weight: totalWeight,
      items: params.items.map(item => ({
        name: item.name,
        ware_key: item.sku,
        payment: { value: 0 }, // Без наложенного платежа
        cost: item.price,
        weight: item.weight,
        amount: item.quantity,
      })),
    }],
  }

  return createOrder(request)
}

/**
 * Отслеживание статуса заказа
 */
export async function trackOrder(identifier: string): Promise<{
  uuid?: string
  cdekNumber?: string
  status?: string
  statusName?: string
  statusDate?: string
  city?: string
  allStatuses: Array<{
    code: string
    name: string
    dateTime: string
    city?: string
  }>
}> {
  // Определяем тип идентификатора
  let orderInfo: CdekOrderInfo
  
  if (identifier.includes('-')) {
    // Похоже на UUID
    orderInfo = await getOrder(identifier)
  } else if (/^\d+$/.test(identifier)) {
    // Только цифры - номер СДЭК
    orderInfo = await getOrderByCdekNumber(identifier)
  } else {
    // Внутренний номер ИМ
    orderInfo = await getOrderByImNumber(identifier)
  }

  const entity = orderInfo.entity
  const lastStatus = entity.statuses?.[entity.statuses.length - 1]

  return {
    uuid: entity.uuid,
    cdekNumber: entity.cdek_number,
    status: lastStatus?.code,
    statusName: lastStatus?.name,
    statusDate: lastStatus?.date_time,
    city: lastStatus?.city,
    allStatuses: entity.statuses?.map(s => ({
      code: s.code,
      name: s.name,
      dateTime: s.date_time,
      city: s.city,
    })) || [],
  }
}

// Экспорт констант тарифов
export { CDEK_TARIFFS }


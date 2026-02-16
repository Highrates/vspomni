import type {
  YandexCalculateResponse,
  YandexCalculatedOffer,
  YandexPickupPointsResponse,
  YandexPickupPoint,
} from '@/types/yandexDelivery'

const API_BASE = '/api/yandex-delivery'

async function post<T>(body: unknown): Promise<T> {
  const res = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  if (!res.ok) {
    const msg = (data as { error?: string }).error || res.statusText
    throw new Error(msg)
  }
  return data as T
}

/** Рассчитать стоимость доставки Яндекса до указанного адреса */
export async function calculateDelivery(params: {
  city: string
  street?: string
  building?: string
  fullname?: string
}): Promise<YandexCalculateResponse> {
  return post<YandexCalculateResponse>({
    action: 'calculate',
    to: {
      city: params.city,
      street: params.street,
      building: params.building,
      fullname: params.fullname,
    },
  })
}

/** Получить самый дешёвый оффер из ответа расчёта */
export function getCheapestOffer(offers: YandexCalculatedOffer[]): YandexCalculatedOffer | null {
  if (!offers?.length) return null
  return offers.reduce((min, o) => {
    const price = parseFloat(o.price?.total_price || '0')
    const minPrice = parseFloat(min.price?.total_price || '0')
    return price < minPrice ? o : min
  })
}

/** Список ПВЗ Яндекса (пункты выдачи и постаматы). Опционально: geo_id, type. */
export async function getPickupPoints(params?: {
  geo_id?: number
  type?: 'pickup_point' | 'terminal' | 'warehouse'
}): Promise<YandexPickupPointsResponse> {
  return post<YandexPickupPointsResponse>({
    action: 'list-pickup-points',
    ...params,
  })
}

export type { YandexPickupPoint }

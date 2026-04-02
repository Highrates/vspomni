// Типы для API Яндекс Доставки (b2b.taxi.yandex.net)

export interface YandexRoutePoint {
  id: number
  coordinates: [number, number] // [долгота, широта]
  fullname: string
  country: string
  city: string
  street?: string
  building?: string
  porch?: string
  sfloor?: string
  sflat?: string
}

export interface YandexCargoItem {
  size: { length: number; width: number; height: number }
  weight: number
  quantity: number
  pickup_point: number
  dropoff_point: number
}

export interface YandexOfferRequirements {
  taxi_classes: string[]
  cargo_type?: string
  cargo_loaders?: number
  pro_courier?: boolean
  cargo_options?: string[]
  skip_door_to_door?: boolean
  due?: string
  rental_duration?: number
}

export interface YandexCalculateRequest {
  items: YandexCargoItem[]
  route_points: YandexRoutePoint[]
  requirements: YandexOfferRequirements
}

export interface YandexCalculatedOfferPrice {
  total_price: string
  total_price_with_vat: string
  base_price: string
  currency: string
  surge_ratio?: number
}

export interface YandexCalculatedOffer {
  price: YandexCalculatedOfferPrice
  taxi_class: string
  description?: string
  payload: string
  offer_ttl: string
  pickup_interval?: { from: string; to: string }
  delivery_interval?: { from: string; to: string }
}

export interface YandexCalculateResponse {
  offers: YandexCalculatedOffer[]
}

export interface YandexClaimCreateRequest {
  offer_payload: string
  route_points: YandexRoutePoint[]
  recipient_name: string
  recipient_phone: string
  comment?: string
}

export interface YandexClaimCreateResponse {
  id: string
  status?: string
}

// ——— Список ПВЗ (API b2b/platform/pickup-points/list) ———

export interface YandexPickupPointAddress {
  geoId?: number
  country?: string
  region?: string
  subRegion?: string
  /** API может отдавать в snake_case */
  sub_region?: string
  locality?: string
  street?: string
  house?: string
  full_address?: string
  postal_code?: string
  comment?: string
  /** Встречаются в ответах platform/pickup-points */
  district?: string
  area?: string
  borough?: string
  dependent_locality?: string
}

export interface YandexPickupPoint {
  id: string
  operator_station_id?: string
  /** camelCase, если прокси/API нормализует ключи */
  operatorStationId?: string
  name: string
  type: 'pickup_point' | 'terminal' | 'warehouse'
  position?: { latitude: number; longitude: number }
  address?: YandexPickupPointAddress
  instruction?: string
  payment_methods?: string[]
  available_for_dropoff?: boolean
}

export interface YandexPickupPointsResponse {
  points: YandexPickupPoint[]
}

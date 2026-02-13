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

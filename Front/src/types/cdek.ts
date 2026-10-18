// ============================================
// CDEK API Types - Полная интеграция по схеме
// ============================================

// --- Авторизация (POST /v2/oauth/token) ---
export interface CdekAuthResponse {
  access_token: string
  token_type: string
  expires_in: number
  scope: string
  jti: string
}

// --- Локации ---
export interface CdekCity {
  code: number
  city_uuid: string
  city: string
  fias_guid?: string
  kladr_code?: string
  country_code: string
  country: string
  region: string
  region_code?: number
  fias_region_guid?: string
  sub_region?: string
  longitude?: number
  latitude?: number
  time_zone?: string
  payment_limit?: number
}

export interface CdekRegion {
  region_code: number
  region: string
  country_code: string
  country: string
}

// --- Пункты выдачи (GET /v2/deliverypoints) ---
export interface CdekDeliveryPoint {
  code: string
  name: string
  uuid?: string
  address_comment?: string
  nearest_station?: string
  nearest_metro_station?: string
  work_time: string
  phones?: CdekPhone[]
  email?: string
  note?: string
  type: 'PVZ' | 'POSTAMAT'
  owner_code?: string
  take_only?: boolean
  is_handout?: boolean
  is_reception?: boolean
  is_dressing_room?: boolean
  have_cashless?: boolean
  have_cash?: boolean
  allowed_cod?: boolean
  site?: string
  office_image_list?: CdekOfficeImage[]
  work_time_list?: CdekWorkTime[]
  work_time_exceptions?: CdekWorkTimeException[]
  weight_min?: number
  weight_max?: number
  location: CdekLocation
  fulfillment?: boolean
  dimensions?: CdekDimensions[]
}

export interface CdekPhone {
  number: string
  additional?: string
}

export interface CdekOfficeImage {
  url: string
  number?: number
}

export interface CdekWorkTime {
  day: number
  time: string
}

export interface CdekWorkTimeException {
  date: string
  time?: string
  is_working: boolean
}

export interface CdekLocation {
  country_code: string
  region_code?: number
  region?: string
  city_code?: number
  city?: string
  fias_guid?: string
  postal_code?: string
  longitude: number
  latitude: number
  address: string
  address_full?: string
}

export interface CdekDimensions {
  width: number
  height: number
  depth: number
}

// --- Калькулятор (POST /v2/calculator/tarifflist, /v2/calculator/tariff) ---
export interface CdekCalculatorRequest {
  type?: number // 1 - интернет-магазин, 2 - доставка
  date?: string // Дата отправки ISO 8601
  currency?: number // 1 - RUB
  tariff_code?: number // Код тарифа (для /tariff)
  from_location: CdekCalculatorLocation
  to_location: CdekCalculatorLocation
  packages: CdekPackage[]
  services?: CdekService[]
}

export interface CdekCalculatorLocation {
  code?: number // Код населенного пункта СДЭК
  postal_code?: string
  country_code?: string
  city?: string
  address?: string
}

export interface CdekPackage {
  height: number // см
  length: number // см
  width: number // см
  weight: number // граммы
}

export interface CdekService {
  code: string
  parameter?: string
}

export interface CdekTariffListResponse {
  tariff_codes: CdekTariff[]
}

export interface CdekTariff {
  tariff_code: number
  tariff_name: string
  tariff_description?: string
  delivery_mode: number
  delivery_sum: number
  period_min: number
  period_max: number
  calendar_min?: number
  calendar_max?: number
}

export interface CdekTariffResponse {
  delivery_sum: number
  period_min: number
  period_max: number
  weight_calc: number
  services?: CdekServiceCost[]
  total_sum: number
  currency: string
}

export interface CdekServiceCost {
  code: string
  sum: number
}

// --- Заказы (POST /v2/orders) ---
export interface CdekOrderRequest {
  type?: number // 1 - интернет-магазин
  number?: string // Номер заказа в системе ИМ
  tariff_code: number
  comment?: string
  developer_key?: string
  shipment_point?: string // Код ПВЗ отправителя
  delivery_point?: string // Код ПВЗ получателя (для доставки до ПВЗ)
  date_invoice?: string
  shipper_name?: string
  shipper_address?: string
  delivery_recipient_cost?: CdekMoney
  delivery_recipient_cost_adv?: CdekThreshold[]
  sender?: CdekContact
  seller?: CdekSeller
  recipient: CdekContact
  from_location?: CdekOrderLocation
  to_location: CdekOrderLocation
  packages: CdekOrderPackage[]
  services?: CdekService[]
  print?: string
}

export interface CdekMoney {
  value: number
  vat_sum?: number
  vat_rate?: number
}

export interface CdekThreshold {
  threshold: number
  sum: number
  vat_sum?: number
  vat_rate?: number
}

export interface CdekContact {
  company?: string
  name: string
  email?: string
  phones: CdekPhone[]
  passport_series?: string
  passport_number?: string
  passport_date_of_issue?: string
  passport_organization?: string
  tin?: string
  passport_date_of_birth?: string
  contragent_type?: string
}

export interface CdekSeller {
  name?: string
  inn?: string
  phone?: string
  ownership_form?: number
  address?: string
}

export interface CdekOrderLocation {
  code?: number
  fias_guid?: string
  postal_code?: string
  longitude?: number
  latitude?: number
  country_code?: string
  region?: string
  region_code?: number
  sub_region?: string
  city?: string
  kladr_code?: string
  address: string
}

export interface CdekOrderPackage {
  number: string // Уникальный номер упаковки
  weight: number // Вес в граммах
  length?: number // см
  width?: number // см
  height?: number // см
  comment?: string
  items: CdekOrderItem[]
}

export interface CdekOrderItem {
  name: string
  ware_key: string // Артикул товара
  payment: CdekMoney
  cost: number // Объявленная стоимость
  weight: number // Вес в граммах
  weight_gross?: number
  amount: number // Количество
  delivery_amount?: number
  name_i18n?: string
  brand?: string
  country_code?: string
  material?: number
  wifi_gsm?: boolean
  url?: string
}

// --- Ответ создания заказа ---
export interface CdekOrderResponse {
  entity?: {
    uuid: string
    is_return?: boolean
    is_reverse?: boolean
    type?: number
    cdek_number?: string
    number?: string
  }
  requests: CdekRequestStatus[]
}

export interface CdekRequestStatus {
  request_uuid: string
  type: string
  state: 'ACCEPTED' | 'WAITING' | 'SUCCESSFUL' | 'INVALID'
  date_time: string
  errors?: CdekError[]
  warnings?: CdekWarning[]
}

export interface CdekError {
  code: string
  message: string
}

export interface CdekWarning {
  code: string
  message: string
}

// --- Информация о заказе (GET /v2/orders/{uuid}) ---
export interface CdekOrderInfo {
  entity: {
    uuid: string
    is_return: boolean
    is_reverse: boolean
    type: number
    cdek_number?: string
    number?: string
    tariff_code: number
    comment?: string
    shipment_point?: string
    delivery_point?: string
    items_cost_currency?: string
    recipient_currency?: string
    date_invoice?: string
    shipper_name?: string
    shipper_address?: string
    delivery_recipient_cost?: CdekMoney
    sender?: CdekContact
    seller?: CdekSeller
    recipient: CdekContact
    from_location?: CdekOrderLocation
    to_location: CdekOrderLocation
    packages: CdekOrderPackageInfo[]
    delivery_detail?: CdekDeliveryDetail
    statuses?: CdekOrderStatus[]
  }
  requests: CdekRequestStatus[]
}

export interface CdekOrderPackageInfo extends CdekOrderPackage {
  package_id?: string
  barcode?: string
}

export interface CdekDeliveryDetail {
  date?: string
  recipient_name?: string
  payment_sum?: number
  delivery_sum?: number
  total_sum?: number
}

export interface CdekOrderStatus {
  code: string
  name: string
  date_time: string
  reason_code?: string
  city?: string
}

// --- Изменение заказа (PATCH /v2/orders) ---
export interface CdekOrderUpdateRequest {
  uuid: string
  cdek_number?: string
  tariff_code?: number
  comment?: string
  shipment_point?: string
  delivery_point?: string
  sender?: CdekContact
  recipient?: CdekContact
  from_location?: CdekOrderLocation
  to_location?: CdekOrderLocation
  packages?: CdekOrderPackage[]
}

// --- Удаление заказа (DELETE /v2/orders/{uuid}) ---
export interface CdekDeleteResponse {
  entity: {
    uuid: string
  }
  requests: CdekRequestStatus[]
}

// --- Отказ от заказа (POST /v2/orders/{uuid}/refusal) ---
export interface CdekRefusalResponse {
  entity: {
    uuid: string
  }
  requests: CdekRequestStatus[]
}

// --- Международные ограничения (POST /v2/international/package/restrictions) ---
export interface CdekInternationalRestrictionRequest {
  from_location: {
    country_code: string
  }
  to_location: {
    country_code: string
  }
}

export interface CdekInternationalRestrictionResponse {
  country_from: string
  country_to: string
  restrictions: {
    code: string
    name: string
    description?: string
  }[]
}

// --- Вебхуки ---
export interface CdekWebhookPayload {
  type: 'ORDER_STATUS' | 'PRINT_FORM' | 'DOWNLOAD_PHOTO' | 'PREALERT_CLOSED'
  date_time: string
  uuid: string
  attributes: {
    is_return?: boolean
    is_reverse?: boolean
    is_client_return?: boolean
    cdek_number?: string
    number?: string
    code?: string // Для ORDER_STATUS
    status_code?: string
    status_date_time?: string
    city?: string
    url?: string // Для PRINT_FORM и DOWNLOAD_PHOTO
  }
}

// --- Популярные тарифы СДЭК ---
export const CDEK_TARIFFS = {
  // Посылка (дверь-дверь)
  COURIER_TO_DOOR: 139,
  // Посылка (склад-дверь)
  WAREHOUSE_TO_DOOR: 137,
  // Посылка (склад-склад) - самый популярный
  WAREHOUSE_TO_PVZ: 136,
  // Посылка (дверь-склад)
  DOOR_TO_PVZ: 138,
  // Экспресс (дверь-дверь)
  EXPRESS_DOOR: 184,
  // Экспресс (склад-склад)
  EXPRESS_PVZ: 366,
  // Экономичный (склад-склад)
  ECONOMY_PVZ: 234,
  // Экономичный (склад-дверь)
  ECONOMY_DOOR: 233,
} as const

export type CdekTariffCode = (typeof CDEK_TARIFFS)[keyof typeof CDEK_TARIFFS]


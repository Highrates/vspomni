export type OrderStatusCode =
  | 'paid'
  | 'packing'
  | 'shipped'
  | 'in_transit'
  | 'delivered'
  | 'canceled'

export type MoneyAmount = {
  amount: number
  currency: string
}

export type OrderLineApi = {
  id: string
  productName: string
  variantName: string
  quantity: number
  unitPrice: { gross: MoneyAmount }
  undiscountedUnitPrice: { gross: MoneyAmount }
  lineTotal?: { gross: MoneyAmount }
  thumbnail: { url: string | null; alt: string }
}

export type OrderAddressApi = {
  firstName: string
  lastName: string
  phone: string
  city: string
  postalCode: string
  streetAddress1: string
  streetAddress2?: string
  countryArea?: string
  companyName?: string
  carrier: 'cdek' | 'yandex' | 'ozon'
  carrierLabel: string
  dropoff: 'pvz' | 'courier'
  dropoffLabel: string
  summary: string
  comment?: string
}

export type OrderFulfillmentApi = {
  id: string
  trackingNumber: string
  isTrackingUrl: boolean
  created: string
}

export type OrderApi = {
  id: string
  number: string | number
  created: string
  status: string
  statusCode: OrderStatusCode
  statusDisplay: string
  chargeStatus: string
  chargeStatusDisplay: string
  carrier: 'cdek' | 'yandex' | 'ozon'
  carrierLabel: string
  deliverySummary: string | null
  shippingAddress: OrderAddressApi | null
  billingAddress: OrderAddressApi | null
  shippingMethodName: string | null
  subtotal: { gross: MoneyAmount }
  shipping: {
    gross: MoneyAmount
    methodName: string | null
    carrier: string
    carrierLabel: string
  }
  total: { gross: MoneyAmount }
  lines: OrderLineApi[]
  fulfillments?: OrderFulfillmentApi[]
  trackingNumbers?: string[]
  trackingNumber?: string | null
  metadata?: Record<string, string>
}

export type OrdersPagination = {
  page: number
  pageSize: number
  total: number
  hasNext: boolean
  hasPrevious: boolean
}

export type OrderItem = {
  id: string
  title: string
  volume: string
  qty: number
  oldPrice: number
  price: number
  lineTotal: number
  img: string
}

export type OrderListItem = {
  id: string
  orderId: string
  date: string
  status: string
  statusCode: OrderStatusCode
  chargeStatus: string
  chargeStatusDisplay: string
  carrier: string
  carrierLabel: string
  deliverySummary: string | null
  shippingAmount: number
  totalAmount: number
  trackingNumber: string | null
  trackingNumbers: string[]
  items: OrderItem[]
}

export type OrderDetail = OrderListItem & {
  created: string
  subtotalAmount: number
  shippingAddress: OrderAddressApi | null
  billingAddress: OrderAddressApi | null
  shippingMethodName: string | null
  metadata: Record<string, string>
}

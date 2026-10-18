/**
 * Заказы профиля — Nest `GET /account/orders[/:id]` (см. `@/api/accountApi`).
 * Адаптер к прежним типам `OrderApi` (суммы в рублях — см. transform.kopecksToRubles).
 */
import { ApiError } from '@/api/apiClient'
import {
  fetchOrderDetailRaw,
  fetchOrderSummaries,
  type NestOrderDetail,
  type NestOrderSummary,
} from '@/api/accountApi'
import { uploadsUrl } from '@/api/apiClient'
import { getShippingCarrierFromAddress, parseVspAddressMeta } from '@/lib/addressVspMeta'
import { ORDER_STATUS_LABELS } from './status'
import type {
  MoneyAmount,
  OrderApi,
  OrderStatusCode,
  OrdersPagination,
} from './types'

const money = (amount: number | null | undefined): { gross: MoneyAmount } => ({
  gross: { amount: Number(amount) || 0, currency: 'RUB' },
})

const CARRIER_LABELS: Record<'cdek' | 'yandex' | 'ozon', string> = {
  cdek: 'СДЭК',
  yandex: 'Яндекс Доставка',
  ozon: 'Ozon',
}

export function mapNestStatus(status: string): {
  code: OrderStatusCode
  display: string
  chargeDisplay: string
} {
  switch (status.toUpperCase()) {
    case 'PAID':
      return { code: 'paid', display: ORDER_STATUS_LABELS.paid, chargeDisplay: 'Оплачен' }
    case 'PACKING':
      return { code: 'packing', display: ORDER_STATUS_LABELS.packing, chargeDisplay: 'Оплачен' }
    case 'SHIPPED':
      return { code: 'shipped', display: ORDER_STATUS_LABELS.shipped, chargeDisplay: 'Оплачен' }
    case 'DELIVERED':
      return { code: 'delivered', display: ORDER_STATUS_LABELS.delivered, chargeDisplay: 'Оплачен' }
    case 'CANCELLED':
    case 'CANCELED':
      return { code: 'canceled', display: ORDER_STATUS_LABELS.canceled, chargeDisplay: 'Не оплачен' }
    case 'REFUNDED':
      return { code: 'refunded', display: ORDER_STATUS_LABELS.refunded, chargeDisplay: 'Возвращён' }
    case 'NEW':
    case 'AWAITING_PAYMENT':
    default:
      return {
        code: 'awaiting_payment',
        display: ORDER_STATUS_LABELS.awaiting_payment,
        chargeDisplay: 'Не оплачен',
      }
  }
}

function carrierFromProvider(provider: string | null | undefined): 'cdek' | 'yandex' | 'ozon' {
  const p = (provider || '').toLowerCase()
  return p === 'yandex' || p === 'ozon' ? p : 'cdek'
}

function mapLines(items: NestOrderSummary['items']): OrderApi['lines'] {
  return (items ?? []).map((item) => {
    const thumb = item.imageUrl ? uploadsUrl(item.imageUrl) : null
    return {
      id: item.id,
      productName: item.title,
      variantName: item.variantName || item.shadeName || '',
      quantity: item.qty,
      unitPrice: money(item.unitPrice),
      undiscountedUnitPrice: money(item.unitPrice),
      lineTotal: money(item.lineTotal),
      thumbnail: { url: thumb, alt: item.title },
    }
  })
}

export function mapNestOrderToApi(o: NestOrderSummary | NestOrderDetail): OrderApi {
  const { code, display, chargeDisplay } = mapNestStatus(o.status)
  const detail = o as NestOrderDetail
  const shipment = detail.shipments?.[0]
  const tracking = o.tracking ?? shipment?.tracking ?? null
  const carrier = carrierFromProvider(o.trackingProvider ?? shipment?.provider)

  const snap = detail.shippingAddress ?? null
  let shippingAddress: OrderApi['shippingAddress'] = null
  let deliverySummary: string | null = null
  let snapCarrier = carrier
  if (snap) {
    const { meta, comment } = parseVspAddressMeta(snap.comment || '')
    snapCarrier = meta?.carrier ?? getShippingCarrierFromAddress(snap.comment)
    const dropoff = meta?.dropoff === 'courier' ? 'courier' : 'pvz'
    const [firstName = '', ...rest] = (snap.recipientName || detail.customerName || '').trim().split(/\s+/)
    shippingAddress = {
      firstName,
      lastName: rest.join(' '),
      phone: snap.phone || detail.phone || '',
      city: snap.city,
      postalCode: snap.postalCode,
      streetAddress1: snap.address,
      streetAddress2: comment,
      countryArea: snap.region,
      carrier: snapCarrier,
      carrierLabel: CARRIER_LABELS[snapCarrier],
      dropoff,
      dropoffLabel: dropoff === 'courier' ? 'Курьер' : 'ПВЗ',
      summary: [snap.city, snap.address].filter(Boolean).join(', '),
      comment: comment || undefined,
    }
    deliverySummary = `${CARRIER_LABELS[snapCarrier]}, ${shippingAddress.dropoffLabel}: ${shippingAddress.summary}`
  }

  const finalCarrier = snap ? snapCarrier : carrier
  const discount = Number(o.discountTotal) || 0

  return {
    id: o.id,
    number: o.number,
    created: o.createdAt,
    status: display,
    statusCode: code,
    statusDisplay: display,
    chargeStatus: code === 'awaiting_payment' ? 'NOT_CHARGED' : 'FULLY_CHARGED',
    chargeStatusDisplay: chargeDisplay,
    carrier: finalCarrier,
    carrierLabel: tracking || snap || o.trackingProvider ? CARRIER_LABELS[finalCarrier] : '',
    deliverySummary,
    shippingAddress,
    billingAddress: null,
    shippingMethodName: null,
    subtotal: money(o.subtotal ?? (o.total - (o.shippingCost ?? 0) + discount)),
    shipping: {
      gross: { amount: Number(o.shippingCost) || 0, currency: 'RUB' },
      methodName: null,
      carrier: finalCarrier,
      carrierLabel: CARRIER_LABELS[finalCarrier],
    },
    total: money(o.total),
    voucherCode: detail.promoCode ?? null,
    promoDiscount: discount > 0 ? money(discount) : undefined,
    lines: mapLines(o.items),
    trackingNumber: tracking,
    trackingNumbers: tracking ? [tracking] : [],
    metadata: {},
  } as OrderApi
}

export async function fetchUserOrders(options?: {
  page?: number
  pageSize?: number
}): Promise<{
  orders: OrderApi[]
  pagination: OrdersPagination
}> {
  const page = Math.max(1, options?.page ?? 1)
  const pageSize = Math.max(1, options?.pageSize ?? 10)

  let rows: NestOrderSummary[]
  try {
    rows = await fetchOrderSummaries()
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) {
      throw new Error('Сессия истекла. Войдите снова, чтобы увидеть заказы.')
    }
    throw e instanceof Error ? e : new Error('Ошибка при загрузке заказов')
  }

  // Nest отдаёт весь список (createdAt desc) — пагинируем на клиенте.
  const total = rows.length
  const start = (page - 1) * pageSize
  const slice = rows.slice(start, start + pageSize)
  return {
    orders: slice.map(mapNestOrderToApi),
    pagination: {
      page,
      pageSize,
      total,
      hasNext: start + pageSize < total,
      hasPrevious: page > 1,
    },
  }
}

export async function fetchUserOrderDetail(orderRef: string): Promise<OrderApi> {
  try {
    return mapNestOrderToApi(await fetchOrderDetailRaw(orderRef))
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) {
      throw new Error('Сессия истекла. Войдите снова.')
    }
    if (e instanceof ApiError && e.status === 404) {
      // orderRef мог быть номером заказа — ищем в списке
      const rows = await fetchOrderSummaries().catch(() => [] as NestOrderSummary[])
      const hit = rows.find((r) => r.number === orderRef)
      if (hit) return mapNestOrderToApi(await fetchOrderDetailRaw(hit.id))
      throw new Error('Заказ не найден')
    }
    throw e instanceof Error ? e : new Error('Заказ не найден')
  }
}

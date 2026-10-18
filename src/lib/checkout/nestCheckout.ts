/**
 * Checkout через Nest (`/orders/*`) вместо Saleor checkout + Front YooKassa BFF.
 *
 *   1. syncCart (живые цены/наличие)         — lib/cart/syncCart
 *   2. requestShippingQuote (HMAC quote)     — ordersApi
 *   3. createOrder (idempotent)              — ordersApi
 *   4. payOrder → confirmationToken (виджет) — ordersApi
 *
 * Оплату фиксирует Nest (webhook `POST /orders/yookassa/webhook` или reconcile
 * в `checkout-status` / `payments/:id/status`) — Front больше не создаёт заказ.
 */
import type { AddressInfo } from '@/graphql/types/auth.types'
import type { CartItem } from '@/types/cart'
import { ApiError, getOrCreateGuestId } from '@/api/apiClient'
import {
  createOrder,
  payOrder,
  requestShippingQuote,
  type CheckoutShippingMethod,
  type CreatedOrder,
  type PayOrderResponse,
  type ShippingAddressInput,
  type ShippingQuoteResult,
} from '@/api/ordersApi'
import { parseVspAddressMeta } from '@/lib/addressVspMeta'
import { buildSyncLines } from '@/lib/cart/syncCart'

// ——— Address → Nest ———

export type CheckoutContactInput = {
  firstName?: string
  lastName?: string
  phone?: string
}

export function carrierToShippingMethod(
  carrier: 'cdek' | 'yandex' | 'ozon' | null | undefined,
): CheckoutShippingMethod {
  if (carrier === 'yandex') return 'YANDEX'
  if (carrier === 'ozon') return 'OZON'
  return 'CDEK'
}

/**
 * Адрес доставки (профиль/checkout) → снимок для Nest.
 * - `address` — физический адрес/ПВЗ (streetAddress1);
 * - `comment` — служебная строка `__VSP:…__` + комментарий пользователя (≤500);
 * - `pvzCode` — код пункта выдачи (СДЭК/Яндекс/Ozon), только для dropoff=pvz.
 * Один и тот же объект используется для quote и create (HMAC считается по нему).
 */
export function buildNestShippingAddress(
  address: AddressInfo & { apartment?: string },
  contact: CheckoutContactInput,
): { shippingAddress: ShippingAddressInput; shippingMethod: CheckoutShippingMethod } {
  const { meta } = parseVspAddressMeta(address.streetAddress2 || '')
  const carrier = meta?.carrier ?? 'cdek'
  const usePvz = meta?.dropoff !== 'courier'
  const pvzCode = usePvz
    ? (carrier === 'yandex'
        ? meta?.yandexPvzId
        : carrier === 'ozon'
          ? meta?.ozonPvzId
          : meta?.cdekPvzId
      )?.trim() || undefined
    : undefined

  const recipientName =
    [contact.firstName || address.firstName, contact.lastName || address.lastName]
      .map((s) => (s || '').trim())
      .filter(Boolean)
      .join(' ') || undefined

  const comment = (address.streetAddress2 || '').trim().slice(0, 500)

  const shippingAddress: ShippingAddressInput = {
    city: (address.city || '').trim(),
    address: (address.streetAddress1 || '').trim(),
    ...(address.apartment?.trim() ? { apartment: address.apartment.trim() } : {}),
    ...(address.countryArea?.trim() ? { region: address.countryArea.trim() } : {}),
    ...(address.cityArea?.trim() ? { district: address.cityArea.trim() } : {}),
    ...(address.postalCode?.trim() ? { postalCode: address.postalCode.trim() } : {}),
    ...(comment ? { comment } : {}),
    ...(pvzCode ? { pvzCode } : {}),
    ...((contact.phone || address.phone)?.trim()
      ? { phone: (contact.phone || address.phone).trim() }
      : {}),
    ...(recipientName ? { recipientName } : {}),
  }
  return { shippingAddress, shippingMethod: carrierToShippingMethod(carrier) }
}

// ——— Pending order (между create/pay и success-страницей) ———

const PENDING_KEY = 'vspomni.checkout.pending.v1'

export type PendingCheckoutOrder = {
  orderId: string
  number: string
  payToken: string | null
  paymentId: string | null
  total: number
  /** Подпись корзины+доставки+промо: тот же набор → переиспользуем заказ, а не плодим новый */
  signature: string
  idempotencyKey: string
  createdAt: number
}

export function readPendingCheckoutOrder(): PendingCheckoutOrder | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(PENDING_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as PendingCheckoutOrder
    if (!parsed?.orderId) return null
    // Awaiting-заказ в Nest живёт ORDER_AWAITING_TTL_MINUTES (60 по умолчанию)
    if (Date.now() - (parsed.createdAt || 0) > 3 * 60 * 60 * 1000) {
      localStorage.removeItem(PENDING_KEY)
      return null
    }
    return parsed
  } catch {
    return null
  }
}

export function writePendingCheckoutOrder(p: PendingCheckoutOrder): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(PENDING_KEY, JSON.stringify(p))
  } catch {
    /* private mode */
  }
}

export function clearPendingCheckoutOrder(): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(PENDING_KEY)
  } catch {
    /* ignore */
  }
}

function newIdempotencyKey(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `idem-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`
}

export function checkoutSignature(input: {
  lines: Array<{ variantId: string; qty: number }>
  shippingAddress: ShippingAddressInput
  shippingMethod: string
  promoCode?: string | null
  email: string
  phone: string
  customerName: string
}): string {
  const lines = [...input.lines]
    .map((l) => `${l.variantId}:${l.qty}`)
    .sort()
    .join('|')
  return [
    lines,
    input.shippingMethod,
    JSON.stringify(input.shippingAddress),
    (input.promoCode || '').trim().toUpperCase(),
    input.email,
    input.phone,
    input.customerName,
  ].join('#')
}

// ——— Orchestration ———

export class CheckoutError extends Error {
  constructor(
    message: string,
    public readonly code:
      | 'EMPTY_CART'
      | 'SHIPPING_CHANGED'
      | 'PROMO_REJECTED'
      | 'CART_CHANGED'
      | 'GENERIC' = 'GENERIC',
    public readonly extra?: { shippingCost?: number },
  ) {
    super(message)
    this.name = 'CheckoutError'
  }
}

export type PrepareNestPaymentInput = {
  items: CartItem[]
  email: string
  phone: string
  customerName: string
  customerNote?: string | null
  address: AddressInfo
  contact: CheckoutContactInput
  promoCode?: string | null
  /** Стоимость доставки, показанная пользователю (клиентская оценка перевозчика). */
  shippingEstimate: number
  shippingFree: boolean
  carrier: 'cdek' | 'yandex' | 'ozon' | null
}

export type PrepareNestPaymentResult = {
  order: Pick<CreatedOrder, 'id' | 'number' | 'total'> & { payToken: string | null }
  pay: PayOrderResponse
  quote: ShippingQuoteResult
  reusedOrder: boolean
}

function isPromoMessage(message: string): boolean {
  return /промокод|promo/i.test(message)
}

/**
 * Подтянуть Nest-стоимость доставки (surcharge + server reprice) и показать в корзине
 * до клика «Оплатить» — чтобы не ловить SHIPPING_CHANGED на первом клике.
 */
export async function reconcileShippingWithNest(input: {
  items: CartItem[]
  address: AddressInfo
  contact?: CheckoutContactInput
  /** Оценка BFF-перевозчика (до Nest surcharge/reprice). */
  clientEstimate: number
}): Promise<{ cost: number; freePvz: boolean } | null> {
  const lines = buildSyncLines(input.items)
  if (!lines.length) return null
  const { shippingAddress, shippingMethod } = buildNestShippingAddress(
    input.address,
    input.contact ?? {},
  )
  if (!shippingAddress.city || !shippingAddress.address) return null
  try {
    const quote = await requestShippingQuote({
      lines,
      shippingAddress,
      shippingMethod,
      clientEstimate: Math.max(0, Math.round(input.clientEstimate)),
    })
    return { cost: quote.cost, freePvz: quote.freePvz }
  } catch (e) {
    console.warn('Nest shipping reconcile failed:', e)
    return null
  }
}

/**
 * shipping-quote → create (или reuse pending) → pay.
 * Бросает `CheckoutError` с кодом для UI.
 */
export async function prepareNestPayment(
  input: PrepareNestPaymentInput,
): Promise<PrepareNestPaymentResult> {
  const lines = buildSyncLines(input.items)
  if (!lines.length) throw new CheckoutError('Корзина пуста.', 'EMPTY_CART')

  const { shippingAddress, shippingMethod } = buildNestShippingAddress(
    input.address,
    input.contact,
  )
  if (!shippingAddress.city || !shippingAddress.address) {
    throw new CheckoutError('Выберите адрес доставки перед оплатой.')
  }

  // 1) Подписанный расчёт доставки
  let quote: ShippingQuoteResult
  try {
    quote = await requestShippingQuote({
      lines,
      shippingAddress,
      shippingMethod,
      clientEstimate: input.shippingFree ? 0 : Math.max(0, Math.round(input.shippingEstimate)),
    })
  } catch (e) {
    throw new CheckoutError(
      e instanceof Error ? e.message : 'Не удалось рассчитать доставку.',
    )
  }

  // Nest — источник правды по цене доставки: если расходится с показанной, просим подтвердить.
  const shown = input.shippingFree ? 0 : Math.round(input.shippingEstimate)
  if (Math.abs(quote.cost - shown) >= 1) {
    throw new CheckoutError(
      `Стоимость доставки уточнена: ${quote.cost} ₽. Проверьте итог и нажмите «Оплатить» ещё раз.`,
      'SHIPPING_CHANGED',
      { shippingCost: quote.cost },
    )
  }

  const signature = checkoutSignature({
    lines,
    shippingAddress,
    shippingMethod,
    promoCode: input.promoCode,
    email: input.email,
    phone: input.phone,
    customerName: input.customerName,
  })

  // 2) Create (reuse незавершённого заказа с тем же составом)
  const pending = readPendingCheckoutOrder()
  let orderId: string
  let number: string
  let total: number
  let payToken: string | null
  let idempotencyKey: string
  let reused = false

  if (pending && pending.signature === signature) {
    orderId = pending.orderId
    number = pending.number
    total = pending.total
    payToken = pending.payToken
    idempotencyKey = pending.idempotencyKey
    reused = true
  } else {
    idempotencyKey = newIdempotencyKey()
    try {
      const created = await createOrder({
        lines,
        email: input.email,
        phone: input.phone,
        customerName: input.customerName,
        customerNote: input.customerNote ?? undefined,
        guestId: getOrCreateGuestId(),
        promoCode: input.promoCode || null,
        idempotencyKey,
        shippingAddress,
        shippingMethod,
        shippingQuote: quote.quote,
      })
      orderId = created.id
      number = created.number
      total = created.total
      payToken = created.payToken ?? null
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Не удалось создать заказ.'
      if (input.promoCode && isPromoMessage(message)) {
        throw new CheckoutError(message, 'PROMO_REJECTED')
      }
      if (e instanceof ApiError && e.status === 400 && /остат|налич|stock|доступн/i.test(message)) {
        throw new CheckoutError(message, 'CART_CHANGED')
      }
      throw new CheckoutError(message)
    }
  }

  // 3) Pay → confirmationToken
  let pay: PayOrderResponse
  try {
    pay = await payOrder(orderId, payToken)
  } catch (e) {
    // Сохраняем заказ, чтобы повтор «Оплатить» не создавал дубль
    writePendingCheckoutOrder({
      orderId,
      number,
      payToken,
      paymentId: null,
      total,
      signature,
      idempotencyKey,
      createdAt: pending?.createdAt ?? Date.now(),
    })
    throw new CheckoutError(
      e instanceof Error ? e.message : 'Не удалось создать платёж.',
    )
  }

  const effectivePayToken = pay.payToken ?? payToken
  writePendingCheckoutOrder({
    orderId,
    number,
    payToken: effectivePayToken,
    paymentId: pay.paymentId ?? null,
    total: pay.total ?? total,
    signature,
    idempotencyKey,
    createdAt: pending && reused ? pending.createdAt : Date.now(),
  })

  return {
    order: { id: orderId, number, total: pay.total ?? total, payToken: effectivePayToken },
    pay,
    quote,
    reusedOrder: reused,
  }
}

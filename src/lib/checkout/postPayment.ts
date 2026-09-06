import { stashPaymentForMetrika } from '@/lib/analytics/yandexMetrika'

const PAYMENT_POLL_INTERVAL_MS = 2000
const PAYMENT_POLL_MAX_ATTEMPTS = 45
/** Даём webhook время создать заказ до idempotent fallback */
const WEBHOOK_GRACE_MS = 6000

export type PendingPaymentStorage = {
  checkoutId: string | null
  paymentId: string | null
  paymentAmount: number | undefined
  shippingAmount: number | undefined
  shippingCarrier: 'cdek' | 'yandex' | 'ozon' | null
}

export function persistPendingPaymentStorage(
  checkoutToken: string,
  amount: number,
  yookassaPaymentId?: string,
  shipping?: { amount: number; carrier: 'cdek' | 'yandex' | 'ozon' | null },
): void {
  localStorage.setItem('pendingCheckoutId', checkoutToken)
  localStorage.setItem('pendingPaymentAmount', amount.toString())
  localStorage.setItem('pendingShippingAmount', String(shipping?.amount ?? 0))
  localStorage.setItem('pendingShippingCarrier', shipping?.carrier || 'cdek')
  if (yookassaPaymentId) {
    localStorage.setItem('pendingPaymentId', yookassaPaymentId)
  }
}

export function readPendingPaymentStorage(): PendingPaymentStorage {
  const paymentAmountStr = localStorage.getItem('pendingPaymentAmount')
  const shippingAmountStr = localStorage.getItem('pendingShippingAmount')
  const carrier = localStorage.getItem('pendingShippingCarrier') as
    | 'cdek'
    | 'yandex'
    | 'ozon'
    | null

  return {
    checkoutId: localStorage.getItem('pendingCheckoutId'),
    paymentId: localStorage.getItem('pendingPaymentId'),
    paymentAmount: paymentAmountStr ? parseFloat(paymentAmountStr) : undefined,
    shippingAmount: shippingAmountStr ? parseFloat(shippingAmountStr) : undefined,
    shippingCarrier:
      carrier === 'cdek' || carrier === 'yandex' || carrier === 'ozon'
        ? carrier
        : null,
  }
}

export function clearPendingPaymentStorage(): void {
  localStorage.removeItem('pendingCheckoutId')
  localStorage.removeItem('pendingPaymentId')
  localStorage.removeItem('pendingPaymentAmount')
  localStorage.removeItem('pendingShippingAmount')
  localStorage.removeItem('pendingShippingCarrier')
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

type PaymentStatusResponse = {
  status?: string
  paid?: boolean
  amount?: { value?: string }
  metadata?: Record<string, string>
}

export async function fetchPaymentStatus(
  paymentId: string,
): Promise<PaymentStatusResponse | null> {
  try {
    const response = await fetch(
      `/api/yookassa/payment-status?paymentId=${encodeURIComponent(paymentId)}`,
    )
    if (!response.ok) return null
    return (await response.json()) as PaymentStatusResponse
  } catch {
    return null
  }
}

export async function enrichPendingPaymentFromYookassa(
  paymentId: string,
): Promise<Partial<PendingPaymentStorage>> {
  const status = await fetchPaymentStatus(paymentId)
  if (!status) return {}

  const meta = status.metadata || {}
  const patch: Partial<PendingPaymentStorage> = {}

  const checkoutId = meta.orderId || meta.checkoutId
  if (checkoutId) {
    patch.checkoutId = checkoutId
    localStorage.setItem('pendingCheckoutId', checkoutId)
  }

  if (meta.shippingAmount) {
    const parsed = parseFloat(String(meta.shippingAmount))
    if (Number.isFinite(parsed)) {
      patch.shippingAmount = parsed
      localStorage.setItem('pendingShippingAmount', String(parsed))
    }
  }

  if (
    meta.shippingCarrier === 'cdek' ||
    meta.shippingCarrier === 'yandex' ||
    meta.shippingCarrier === 'ozon'
  ) {
    patch.shippingCarrier = meta.shippingCarrier
    localStorage.setItem('pendingShippingCarrier', meta.shippingCarrier)
  }

  if (status.amount?.value) {
    const amount = parseFloat(status.amount.value)
    if (Number.isFinite(amount)) {
      patch.paymentAmount = amount
      localStorage.setItem('pendingPaymentAmount', String(amount))
    }
  }

  return patch
}

export async function waitForPaymentSucceeded(paymentId: string): Promise<boolean> {
  for (let attempt = 0; attempt < PAYMENT_POLL_MAX_ATTEMPTS; attempt += 1) {
    const status = await fetchPaymentStatus(paymentId)
    if (status?.status === 'succeeded' || status?.paid) {
      return true
    }
    await sleep(PAYMENT_POLL_INTERVAL_MS)
  }
  return false
}

async function finalizeOrderViaApi(
  paymentId: string,
): Promise<
  | { ok: true; orderNumber: string; orderId?: string }
  | {
      ok: false
      stockFailure: boolean
      refunded?: boolean
      error: string
      code?: string
    }
  | never
> {
  const response = await fetch('/api/yookassa/finalize-order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ paymentId }),
  })

  const data = await response.json()

  if (response.status === 409 && data.code) {
    const requiresRefund = Boolean(data.requiresRefund)
    const userMessage =
      data.code === 'INSUFFICIENT_STOCK'
        ? data.message ||
          data.error ||
          'Товар закончился на складе. Оплата будет возвращена.'
        : data.code === 'PAYMENT_AMOUNT_MISMATCH'
          ? 'Сумма оплаты не совпала с заказом. Оплата будет возвращена.'
          : data.code === 'CHECKOUT_QUANTITY_LIMIT'
            ? 'Не удалось применить промокод к заказу. Оплата будет возвращена.'
            : data.message || data.error || 'Не удалось оформить заказ.'

    return {
      ok: false,
      stockFailure: requiresRefund,
      refunded: Boolean(data.refunded),
      error: userMessage,
      code: String(data.code),
    }
  }

  if (!response.ok || !data.success) {
    throw new Error(data.error || 'Failed to finalize order')
  }

  const orderNumber = String(data.order?.number || data.order?.id || '')
  if (!orderNumber) {
    throw new Error('Order was not returned after finalize')
  }

  return {
    ok: true,
    orderNumber,
    orderId: data.order?.id,
  }
}

export type PostPaymentResult =
  | {
      ok: true
      orderNumber: string
      orderId?: string
      paymentAmount?: number
      paymentId: string | null
    }
  | {
      ok: false
      error: string
      processing?: boolean
      stockFailure?: boolean
      refunded?: boolean
      paymentId?: string | null
      paymentAmount?: number
    }

/**
 * Webhook создаёт заказ (primary). Success page ждёт оплату → grace →
 * idempotent POST /api/yookassa/finalize-order (REST complete, не GraphQL).
 */
export async function resolveOrderAfterPayment(): Promise<PostPaymentResult> {
  let ctx = readPendingPaymentStorage()

  if (!ctx.paymentId) {
    return {
      ok: false,
      error:
        'Не удалось подтвердить заказ. Если оплата прошла — проверьте раздел «Заказы» в профиле.',
    }
  }

  const paymentId = ctx.paymentId

  if (!ctx.checkoutId) {
    const recovered = await enrichPendingPaymentFromYookassa(paymentId)
    ctx = { ...ctx, ...recovered }
  }

  const paid = await waitForPaymentSucceeded(paymentId)
  if (!paid) {
    return {
      ok: false,
      error: 'Оплата ещё не подтверждена. Подождите и обновите страницу.',
      paymentId,
      paymentAmount: ctx.paymentAmount,
    }
  }

  stashPaymentForMetrika({
    paymentId,
    revenue: ctx.paymentAmount,
  })

  await sleep(WEBHOOK_GRACE_MS)

  try {
    const order = await finalizeOrderViaApi(paymentId)
    if (!order.ok) {
      clearPendingPaymentStorage()
      return {
        ok: false,
        stockFailure: Boolean(order.stockFailure),
        refunded: order.refunded,
        error: order.error,
        paymentId,
        paymentAmount: ctx.paymentAmount,
      }
    }
    return {
      ok: true,
      orderNumber: order.orderNumber,
      orderId: order.orderId,
      paymentAmount: ctx.paymentAmount,
      paymentId,
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Не удалось оформить заказ'
    return {
      ok: false,
      processing: true,
      error: `${message}. Заказ может появиться в профиле через минуту — обновите страницу «Заказы».`,
      paymentId: ctx.paymentId,
      paymentAmount: ctx.paymentAmount,
    }
  }
}

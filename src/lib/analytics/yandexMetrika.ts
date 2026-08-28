/** Счётчик Яндекс.Метрики */
export const YANDEX_METRIKA_ID = 111454140

/** Идентификатор цели в Метрике: «JavaScript-событие» → payment_success */
export const YANDEX_METRIKA_PAYMENT_GOAL = 'payment_success'

const PAYMENT_PENDING_KEY = 'ym_payment_pending'
const PAYMENT_TRACKED_PREFIX = 'ym_payment_tracked:'

type YmFn = (...args: unknown[]) => void

function getYm(): YmFn | null {
  if (typeof window === 'undefined') return null
  const ym = (window as Window & { ym?: YmFn }).ym
  return typeof ym === 'function' ? ym : null
}

export function reachYandexGoal(
  goal: string,
  params?: Record<string, unknown>,
): boolean {
  const ym = getYm()
  if (!ym) return false
  if (params && Object.keys(params).length > 0) {
    ym(YANDEX_METRIKA_ID, 'reachGoal', goal, params)
  } else {
    ym(YANDEX_METRIKA_ID, 'reachGoal', goal)
  }
  return true
}

export type PaymentMetrikaPayload = {
  paymentId?: string | null
  orderId?: string | null
  orderNumber?: string | null
  revenue?: number | null
}

/** Сохраняем данные оплаты до редиректа на /checkout/success */
export function stashPaymentForMetrika(payload: PaymentMetrikaPayload): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(PAYMENT_PENDING_KEY, JSON.stringify(payload))
  } catch {
    // Safari private mode
  }
}

function readStashedPayment(): PaymentMetrikaPayload | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(PAYMENT_PENDING_KEY)
    if (!raw) return null
    return JSON.parse(raw) as PaymentMetrikaPayload
  } catch {
    return null
  }
}

function clearStashedPayment(): void {
  try {
    sessionStorage.removeItem(PAYMENT_PENDING_KEY)
  } catch {
    // ignore
  }
}

/** Цель «Оплата на сайте». Не дублирует одно и то же paymentId/orderId. */
export function trackPaymentSuccess(payload: PaymentMetrikaPayload = {}): boolean {
  const stashed = readStashedPayment()
  const merged: PaymentMetrikaPayload = {
    paymentId: payload.paymentId ?? stashed?.paymentId,
    orderId: payload.orderId ?? stashed?.orderId,
    orderNumber: payload.orderNumber ?? stashed?.orderNumber,
    revenue: payload.revenue ?? stashed?.revenue,
  }

  const dedupKey =
    merged.paymentId || merged.orderId || merged.orderNumber || null
  if (dedupKey) {
    const storageKey = PAYMENT_TRACKED_PREFIX + dedupKey
    try {
      if (sessionStorage.getItem(storageKey)) {
        clearStashedPayment()
        return false
      }
      sessionStorage.setItem(storageKey, '1')
    } catch {
      // continue without dedup
    }
  }

  const goalParams: Record<string, unknown> = {}
  if (merged.revenue != null && Number.isFinite(merged.revenue)) {
    goalParams.order_price = merged.revenue
    goalParams.currency = 'RUB'
  }
  if (merged.orderNumber) goalParams.order_id = merged.orderNumber
  if (merged.paymentId) goalParams.payment_id = merged.paymentId

  const sent = reachYandexGoal(
    YANDEX_METRIKA_PAYMENT_GOAL,
    Object.keys(goalParams).length ? goalParams : undefined,
  )
  if (sent) clearStashedPayment()
  return sent
}

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

/** Ждём загрузку счётчика (Script afterInteractive часто позже useEffect). */
function waitForYm(timeoutMs = 8000): Promise<YmFn | null> {
  const existing = getYm()
  if (existing) return Promise.resolve(existing)

  return new Promise((resolve) => {
    const started = Date.now()
    const timer = window.setInterval(() => {
      const ym = getYm()
      if (ym) {
        window.clearInterval(timer)
        resolve(ym)
        return
      }
      if (Date.now() - started >= timeoutMs) {
        window.clearInterval(timer)
        resolve(null)
      }
    }, 100)
  })
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

async function reachYandexGoalWhenReady(
  goal: string,
  params?: Record<string, unknown>,
): Promise<boolean> {
  const ym = (await waitForYm()) || getYm()
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

function buildGoalParams(merged: PaymentMetrikaPayload): Record<string, unknown> {
  const goalParams: Record<string, unknown> = {}
  if (merged.revenue != null && Number.isFinite(merged.revenue)) {
    goalParams.order_price = merged.revenue
    goalParams.currency = 'RUB'
  }
  if (merged.orderNumber) goalParams.order_id = merged.orderNumber
  if (merged.paymentId) goalParams.payment_id = merged.paymentId
  return goalParams
}

function mergePaymentPayload(payload: PaymentMetrikaPayload): PaymentMetrikaPayload {
  const stashed = readStashedPayment()
  return {
    paymentId: payload.paymentId ?? stashed?.paymentId,
    orderId: payload.orderId ?? stashed?.orderId,
    orderNumber: payload.orderNumber ?? stashed?.orderNumber,
    revenue: payload.revenue ?? stashed?.revenue,
  }
}

function wasPaymentAlreadyTracked(dedupKey: string): boolean {
  try {
    return Boolean(sessionStorage.getItem(PAYMENT_TRACKED_PREFIX + dedupKey))
  } catch {
    return false
  }
}

function markPaymentTracked(dedupKey: string): void {
  try {
    sessionStorage.setItem(PAYMENT_TRACKED_PREFIX + dedupKey, '1')
  } catch {
    // ignore
  }
}

/**
 * Цель «Оплата на сайте» (JS-событие payment_success).
 * Ждёт ym и помечает dedup только после успешной отправки.
 */
export async function trackPaymentSuccess(
  payload: PaymentMetrikaPayload = {},
): Promise<boolean> {
  const merged = mergePaymentPayload(payload)
  const dedupKey =
    merged.paymentId || merged.orderId || merged.orderNumber || null

  if (dedupKey && wasPaymentAlreadyTracked(dedupKey)) {
    clearStashedPayment()
    return false
  }

  const goalParams = buildGoalParams(merged)
  const sent = await reachYandexGoalWhenReady(
    YANDEX_METRIKA_PAYMENT_GOAL,
    Object.keys(goalParams).length ? goalParams : undefined,
  )

  if (!sent) {
    console.warn(
      '[ym] reachGoal payment_success skipped: counter not ready',
      merged,
    )
    return false
  }

  if (dedupKey) markPaymentTracked(dedupKey)
  clearStashedPayment()
  return true
}

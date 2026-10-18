/**
 * После оплаты: подтверждение заказа через Nest.
 *
 * Nest финализирует заказ сам (webhook `POST /orders/yookassa/webhook`); `checkout-status`
 * и `payments/:id/status` дополнительно сверяются с ЮKassa (нужно локально, где webhook
 * недоступен). Front больше не создаёт заказ и не ходит в ЮKassa напрямую.
 */
import { stashPaymentForMetrika } from '@/lib/analytics/yandexMetrika'
import { ApiError } from '@/api/apiClient'
import { getCheckoutStatus, getPaymentStatus } from '@/api/ordersApi'
import {
  clearPendingCheckoutOrder,
  readPendingCheckoutOrder,
} from '@/lib/checkout/nestCheckout'

const PAYMENT_POLL_INTERVAL_MS = 2000
const PAYMENT_POLL_MAX_ATTEMPTS = 45

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function clearPendingPaymentStorage(): void {
  clearPendingCheckoutOrder()
}

export type PaymentStatusResponse = {
  status?: string
  paid?: boolean
  latePayment?: boolean
  message?: string
}

/** Статус платежа (Nest сверяется с ЮKassa). null — сеть/нет доступа. */
export async function fetchPaymentStatus(
  paymentId: string,
  payToken?: string | null,
): Promise<PaymentStatusResponse | null> {
  const token = payToken ?? readPendingCheckoutOrder()?.payToken ?? null
  if (!token) return null
  try {
    return await getPaymentStatus(paymentId, token)
  } catch {
    return null
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
 * Success-страница: ждём, пока Nest переведёт заказ в PAID.
 * `orderId` берём из query (return_url Nest), иначе из pending-заказа.
 */
export async function resolveOrderAfterPayment(params?: {
  orderId?: string | null
}): Promise<PostPaymentResult> {
  const pending = readPendingCheckoutOrder()
  const orderId = params?.orderId?.trim() || pending?.orderId || ''
  if (!orderId) {
    return {
      ok: false,
      error:
        'Не удалось подтвердить заказ. Если оплата прошла — проверьте раздел «Заказы» в профиле.',
    }
  }
  const payToken = pending && pending.orderId === orderId ? pending.payToken : null
  const paymentId = pending && pending.orderId === orderId ? pending.paymentId : null
  const paymentAmount = pending && pending.orderId === orderId ? pending.total : undefined

  for (let attempt = 0; attempt < PAYMENT_POLL_MAX_ATTEMPTS; attempt += 1) {
    try {
      const status = await getCheckoutStatus(orderId, payToken)
      if (status.paid) {
        stashPaymentForMetrika({ paymentId: paymentId ?? orderId, revenue: paymentAmount })
        return {
          ok: true,
          orderNumber: String(status.number || pending?.number || orderId),
          orderId: status.orderId || orderId,
          paymentAmount,
          paymentId,
        }
      }
      const msg = status.message || ''
      // Терминальные состояния: отмена / просрочка / автовозврат
      if (/истёк|отменён|автовозврат|нельзя подтвердить/i.test(msg)) {
        const refunded = /автовозврат/i.test(msg) && !/не удался/i.test(msg)
        return {
          ok: false,
          error: msg,
          stockFailure: refunded,
          refunded,
          paymentId,
          paymentAmount,
        }
      }
    } catch (e) {
      if (e instanceof ApiError && (e.status === 403 || e.status === 404)) {
        return {
          ok: false,
          processing: true,
          error:
            'Не удалось подтвердить оплату в этом браузере. Проверьте раздел «Заказы» в профиле — заказ появится после подтверждения оплаты.',
          paymentId,
          paymentAmount,
        }
      }
      // сетевые/5xx — пробуем ещё
    }
    await sleep(PAYMENT_POLL_INTERVAL_MS)
  }

  return {
    ok: false,
    processing: true,
    error:
      'Оплата ещё не подтверждена. Если деньги списаны, заказ появится в профиле в течение нескольких минут.',
    paymentId,
    paymentAmount,
  }
}

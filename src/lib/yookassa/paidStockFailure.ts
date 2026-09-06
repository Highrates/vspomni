import { yookassaCreateRefund } from '@/lib/yookassa/server'

export type PaidStockFailureResult = {
  refunded: boolean
  refundId?: string
  refundError?: string
}

/**
 * Оплата прошла, но заказ не создан из‑за нехватки стока — возврат через YooKassa.
 */
export async function handlePaidStockFailure(params: {
  paymentId: string
  checkoutId: string
  paymentAmount: number
  userEmail?: string
  reason: string
}): Promise<PaidStockFailureResult> {
  const { paymentId, checkoutId, paymentAmount, userEmail, reason } = params

  console.error('[paid-stock-failure]', {
    paymentId,
    checkoutId,
    paymentAmount,
    userEmail,
    reason,
  })

  try {
    const refund = await yookassaCreateRefund({
      paymentId,
      amount: paymentAmount,
    })
    console.log('[paid-stock-failure] refund created:', refund.id, refund.status)
    return { refunded: true, refundId: refund.id }
  } catch (refundError: unknown) {
    const refundErrorMessage =
      refundError instanceof Error ? refundError.message : 'Refund failed'
    console.error('[paid-stock-failure] refund failed:', refundErrorMessage)
    return { refunded: false, refundError: refundErrorMessage }
  }
}

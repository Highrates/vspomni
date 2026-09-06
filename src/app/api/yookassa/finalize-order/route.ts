import { NextRequest, NextResponse } from 'next/server'
import {
  finalizeCheckoutViaRest,
  CheckoutFinalizeError,
} from '@/graphql/queries/cart.service'
import { verifyYookassaSucceededPayment } from '@/lib/yookassa/server'
import { handlePaidStockFailure } from '@/lib/yookassa/paidStockFailure'

/**
 * Idempotent fallback: возвращает существующий заказ, если webhook уже успел.
 * Единственный путь complete на клиенте — REST через finalizeCheckoutViaRest.
 */
export async function POST(request: NextRequest) {
  let paymentId = ''
  let checkoutId = ''
  let paymentAmount = 0
  let userEmail: string | undefined
  let shippingAmount: number | undefined
  let shippingCarrier: 'cdek' | 'yandex' | 'ozon' | undefined
  let allowFreeShipping: boolean | undefined

  try {
    const body = (await request.json()) as { paymentId?: string }
    paymentId = body.paymentId?.trim() || ''

    if (!paymentId) {
      return NextResponse.json({ error: 'paymentId is required' }, { status: 400 })
    }

    let verified
    try {
      verified = await verifyYookassaSucceededPayment(paymentId)
    } catch (verifyError: unknown) {
      const message =
        verifyError instanceof Error ? verifyError.message : 'Payment verification failed'
      return NextResponse.json({ error: message }, { status: 400 })
    }

    ;({
      checkoutId,
      paymentAmount,
      shippingAmount,
      shippingCarrier,
      userEmail,
      allowFreeShipping,
    } = verified)

    const result = await finalizeCheckoutViaRest({
      checkoutId,
      userEmail,
      paymentAmount,
      paymentId,
      shippingAmount,
      shippingCarrier,
      allowFreeShipping,
    })

    return NextResponse.json({
      success: true,
      checkoutId,
      order: result.order,
    })
  } catch (error: unknown) {
    if (error instanceof CheckoutFinalizeError && error.requiresRefund) {
      const recovery =
        paymentId && checkoutId
          ? await handlePaidStockFailure({
              paymentId,
              checkoutId,
              paymentAmount,
              userEmail,
              reason: `[${error.code}] ${error.message}`,
            })
          : { refunded: false, refundError: 'Missing payment context for refund' }

      const userMessage =
        error.code === 'PAYMENT_AMOUNT_MISMATCH'
          ? 'Сумма оплаты не совпала с заказом. Оплата будет возвращена автоматически.'
          : error.code === 'CHECKOUT_QUANTITY_LIMIT'
            ? 'Не удалось применить промокод к заказу. Оплата будет возвращена.'
            : recovery.refunded
              ? 'Оплата возвращена: не удалось оформить заказ.'
              : 'Не удалось оформить заказ. Мы уведомили оператора — возврат будет выполнен вручную.'

      return NextResponse.json(
        {
          success: false,
          code: error.code,
          error: userMessage,
          message: userMessage,
          items: error.items,
          expectedTotal: error.expectedTotal,
          paidAmount: error.paidAmount,
          refunded: recovery.refunded,
          refundId: recovery.refundId,
          refundError: recovery.refundError,
        },
        { status: 409 },
      )
    }

    const message = error instanceof Error ? error.message : 'Finalize failed'
    console.error('YooKassa finalize-order error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}

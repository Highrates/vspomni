import { NextRequest, NextResponse } from 'next/server'
import {
  finalizeCheckoutViaRest,
  CheckoutFinalizeError,
} from '@/graphql/queries/cart.service'
import {
  assertYookassaWebhookIp,
  verifyYookassaSucceededPayment,
} from '@/lib/yookassa/server'
import { handlePaidStockFailure } from '@/lib/yookassa/paidStockFailure'

/**
 * Обработчик вебхуков ЮKassa
 * https://yookassa.ru/developers/using-api/webhooks
 */
export async function POST(request: NextRequest) {
  console.log('--- YooKassa Webhook Received ---')

  try {
    try {
      assertYookassaWebhookIp(request)
    } catch (ipError: unknown) {
      const message = ipError instanceof Error ? ipError.message : 'Untrusted IP'
      console.warn(message)
      return NextResponse.json({ error: message }, { status: 403 })
    }

    const body = await request.json()
    console.log('Webhook payload:', JSON.stringify(body, null, 2))

    const { event, object } = body

    if (event !== 'payment.succeeded') {
      console.log(`Ignoring event type: ${event}`)
      return NextResponse.json({ received: true })
    }

    const paymentId = object?.id as string | undefined
    const webhookCheckoutId = object?.metadata?.orderId || object?.metadata?.checkoutId
    const webhookAmount = object?.amount?.value
      ? parseFloat(String(object.amount.value))
      : undefined

    if (!paymentId) {
      return NextResponse.json({ error: 'Missing payment id' }, { status: 400 })
    }

    if (!webhookCheckoutId) {
      console.log(
        'Webhook ignored: no checkoutId in metadata (not a site checkout)',
        object?.metadata,
      )
      return NextResponse.json({ received: true, ignored: true })
    }

    let verified
    try {
      verified = await verifyYookassaSucceededPayment(paymentId, {
        expectedCheckoutId: webhookCheckoutId,
        expectedAmount: webhookAmount,
      })
    } catch (verifyError: unknown) {
      const message =
        verifyError instanceof Error ? verifyError.message : 'Payment verification failed'
      console.error('Webhook payment verification failed:', message)
      return NextResponse.json({ error: message }, { status: 400 })
    }

    const {
      checkoutId,
      paymentAmount,
      shippingAmount,
      shippingCarrier,
      userEmail,
      allowFreeShipping,
    } = verified

    console.log(`Processing verified payment for checkout: ${checkoutId}`, {
      paymentId,
      paymentAmount,
    })

    try {
      console.log('Starting finalizeCheckoutViaRest via Webhook...')
      const result = await finalizeCheckoutViaRest({
        checkoutId,
        userEmail,
        paymentAmount,
        paymentId,
        shippingAmount,
        shippingCarrier,
        allowFreeShipping,
      })

      console.log('Order successfully finalized via Webhook:', {
        orderId: result.order?.id,
        orderNumber: result.order?.number,
      })

      return NextResponse.json({
        success: true,
        orderNumber: result.order?.number,
      })
    } catch (checkoutError: unknown) {
      if (
        checkoutError instanceof CheckoutFinalizeError &&
        checkoutError.requiresRefund
      ) {
        const recovery = await handlePaidStockFailure({
          paymentId,
          checkoutId,
          paymentAmount,
          userEmail,
          reason: `[${checkoutError.code}] ${checkoutError.message}`,
        })

        console.error('Paid checkout finalize failure via webhook:', {
          checkoutId,
          paymentId,
          code: checkoutError.code,
          refunded: recovery.refunded,
          refundError: recovery.refundError,
        })

        return NextResponse.json({
          received: true,
          orderNotCreated: true,
          code: checkoutError.code,
          refunded: recovery.refunded,
          refundId: recovery.refundId,
          refundError: recovery.refundError,
        })
      }

      const message =
        checkoutError instanceof Error ? checkoutError.message : 'Finalize failed'
      console.error('Error finalizing checkout via Webhook:', message)
      return NextResponse.json(
        {
          error: 'Failed to finalize checkout',
          message,
        },
        { status: 500 },
      )
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error'
    console.error('Webhook Processing Error:', message)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}

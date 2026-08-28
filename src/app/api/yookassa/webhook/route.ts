import { NextRequest, NextResponse } from 'next/server'
import { finalizeCheckoutViaRest } from '@/graphql/queries/cart.service'

/**
 * Обработчик вебхуков ЮKassa
 * https://yookassa.ru/developers/using-api/webhooks
 */
export async function POST(request: NextRequest) {
    console.log('--- YooKassa Webhook Received ---')

    try {
        const body = await request.json()
        console.log('Webhook payload:', JSON.stringify(body, null, 2))

        const { event, object } = body

        // Нас интересует только успешная оплата
        if (event !== 'payment.succeeded') {
            console.log(`Ignoring event type: ${event}`)
            return NextResponse.json({ received: true })
        }

        const { id: paymentId, status, amount, metadata } = object
        const checkoutId = metadata?.orderId || metadata?.checkoutId

        if (!checkoutId) {
            // Платежи не с сайта (инвойсы dashboard и т.п.) — игнорируем, чтобы ЮKassa не ретраила
            console.log('Webhook ignored: no checkoutId in metadata (not a site checkout)', metadata)
            return NextResponse.json({ received: true, ignored: true })
        }

        console.log(`Processing successful payment for checkout: ${checkoutId}`, {
            paymentId,
            status,
            amount: amount.value,
        })

        // Вызываем серверную логику финализации заказа
        // Мы передаем email из метаданных, если он там есть
        const userEmail = metadata?.userId || metadata?.userEmail
        const paymentAmount = parseFloat(amount.value)
        const shippingAmount = metadata?.shippingAmount
          ? parseFloat(String(metadata.shippingAmount))
          : undefined
        const shippingCarrier = metadata?.shippingCarrier as
          | 'cdek'
          | 'yandex'
          | 'ozon'
          | undefined

        try {
            console.log('Starting finalizeCheckoutViaRest via Webhook...')
            const result = await finalizeCheckoutViaRest({
              checkoutId,
              userEmail,
              paymentAmount,
              paymentId,
              shippingAmount,
              shippingCarrier,
            })

            console.log('Order successfully finalized via Webhook:', {
                orderId: result.order?.id,
                orderNumber: result.order?.number
            })

            return NextResponse.json({
                success: true,
                orderNumber: result.order?.number
            })
        } catch (checkoutError: any) {
            console.error('Error finalizing checkout via Webhook:', checkoutError)
            // Возвращаем 500, чтобы ЮKassa могла повторить запрос позже (идемпотентность обеспечена на бэкенде)
            return NextResponse.json({
                error: 'Failed to finalize checkout',
                message: checkoutError.message
            }, { status: 500 })
        }

    } catch (error: any) {
        console.error('Webhook Processing Error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

// CORS
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

import { NextRequest, NextResponse } from 'next/server'
import { yookassaGetPayment } from '@/lib/yookassa/server'

export async function GET(request: NextRequest) {
  try {
    const paymentId = request.nextUrl.searchParams.get('paymentId')?.trim()

    if (!paymentId) {
      return NextResponse.json({ error: 'paymentId is required' }, { status: 400 })
    }

    const payment = await yookassaGetPayment(paymentId)

    return NextResponse.json({
      paymentId: payment.id,
      status: payment.status,
      paid: payment.paid || payment.status === 'succeeded',
      amount: payment.amount,
    })
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to check payment status'
    console.error('YooKassa payment-status error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

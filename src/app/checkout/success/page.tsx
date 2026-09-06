'use client'

import Link from 'next/link'
import { useEffect, useState, Suspense } from 'react'
import { useCartStore } from '@/stores/useCart'
import { useCheckoutStore } from '@/stores/useCheckout'
import { trackPaymentSuccess } from '@/lib/analytics/yandexMetrika'
import {
  clearPendingPaymentStorage,
  resolveOrderAfterPayment,
} from '@/lib/checkout/postPayment'

function CheckoutSuccessContent() {
  const { clearCart } = useCartStore()
  const { clearCheckout } = useCheckoutStore()
  const [isCompleting, setIsCompleting] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const [orderNumber, setOrderNumber] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function run() {
      const result = await resolveOrderAfterPayment()
      if (cancelled) return

      if (result.ok) {
        setOrderNumber(result.orderNumber)
        void trackPaymentSuccess({
          paymentId: result.paymentId,
          orderId: result.orderId,
          orderNumber: result.orderNumber,
          revenue: result.paymentAmount,
        })
        clearPendingPaymentStorage()
        clearCart()
        clearCheckout()
        setIsCompleting(false)
        return
      }

      setError(result.error)
      setProcessing(Boolean(result.processing) && !result.stockFailure)
      if (result.stockFailure) {
        clearPendingPaymentStorage()
      } else if (result.paymentId) {
        void trackPaymentSuccess({
          paymentId: result.paymentId,
          revenue: result.paymentAmount,
        })
      }
      setIsCompleting(false)
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [clearCart, clearCheckout])

  return (
    <div className="min-h-[calc(100vh-80px)] flex items-center justify-center px-4 py-12 text-center">
      <div className="w-full" style={{ maxWidth: '640px', margin: '0 auto' }}>
        {isCompleting ? (
          <>
            <h1 className="text-3xl sm:text-[36px] leading-tight font-semibold">
              Обработка заказа...
            </h1>
            <p className="mt-3 text-xs sm:text-sm text-gray-400">
              Подтверждаем оплату и оформляем заказ
            </p>
          </>
        ) : error ? (
          <>
            <h1 className="text-3xl sm:text-[36px] leading-tight font-semibold text-red-600">
              {processing
                ? 'Заказ обрабатывается'
                : error?.includes('возвращ')
                  ? 'Оплата возвращена'
                  : 'Ошибка при обработке заказа'}
            </h1>
            <p className="mt-3 text-xs sm:text-sm text-red-400">{error}</p>
            <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/catalog"
                className="inline-flex items-center justify-center rounded-full px-6 py-2.5 text-sm font-medium bg-black text-white hover:bg-gray-900 transition-colors"
              >
                Вернуться в каталог
              </Link>
              {!error?.includes('возвращ') ? (
                <Link
                  href="/profile?tab=my-orders"
                  className="inline-flex items-center justify-center rounded-full px-6 py-2.5 text-sm font-medium border border-black text-black hover:bg-black hover:text-white transition-colors"
                >
                  Проверить заказы в профиле
                </Link>
              ) : null}
            </div>
          </>
        ) : (
          <>
            <h1 className="text-3xl sm:text-[36px] leading-tight font-semibold">
              Ваш заказ оформлен&nbsp;успешно!
            </h1>
            {orderNumber ? (
              <p className="mt-2 text-sm text-gray-500">Номер заказа: {orderNumber}</p>
            ) : null}
            <p className="mt-3 text-xs sm:text-sm text-gray-400">
              Спасибо, что выбираете ВСПОМНИ.
            </p>
          </>
        )}

        {!isCompleting && !error ? (
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/profile?tab=my-orders"
              className="inline-flex items-center justify-center rounded-full px-6 py-2.5 text-sm font-medium bg-black text-white hover:bg-gray-900 transition-colors w-full sm:w-auto text-center"
            >
              Перейти к заказам
            </Link>
            <Link
              href="/catalog"
              className="inline-flex items-center justify-center rounded-full px-6 py-2.5 text-sm font-medium border border-black text-black hover:bg-black hover:text-white transition-colors w-full sm:w-auto text-center"
            >
              Вернуться в каталог
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[calc(100vh-80px)] flex items-center justify-center px-4 py-12 text-center">
          <div className="w-full" style={{ maxWidth: '640px', margin: '0 auto' }}>
            <h1 className="text-3xl sm:text-[36px] leading-tight font-semibold">
              Загрузка...
            </h1>
          </div>
        </div>
      }
    >
      <CheckoutSuccessContent />
    </Suspense>
  )
}

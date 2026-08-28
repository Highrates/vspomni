'use client'

import Link from 'next/link'
import { useEffect, useState, Suspense } from 'react'
import { useCartStore } from '@/stores/useCart'
import { useCheckoutStore } from '@/stores/useCheckout'
import { getAccountEmail } from '@/lib/auth/accountEmail'
import {
  buildCheckoutContact,
  resolveCheckoutDeliveryAddress,
} from '@/lib/checkout/deliveryAddress'
import { useUserStore } from '@/stores/useUser'
import { trackPaymentSuccess } from '@/lib/analytics/yandexMetrika'

async function verifyPaymentSucceeded(paymentId: string): Promise<boolean> {
  try {
    const response = await fetch(
      `/api/yookassa/payment-status?paymentId=${encodeURIComponent(paymentId)}`,
    )
    if (!response.ok) return false
    const data = await response.json()
    return data.status === 'succeeded' || data.paid === true
  } catch {
    return false
  }
}

function clearPendingCheckoutStorage() {
  localStorage.removeItem('pendingCheckoutId')
  localStorage.removeItem('pendingPaymentId')
  localStorage.removeItem('pendingPaymentAmount')
  localStorage.removeItem('pendingShippingAmount')
  localStorage.removeItem('pendingShippingCarrier')
}

const CheckoutSuccessContent = () => {
  const { clearCart } = useCartStore()
  const { clearCheckout } = useCheckoutStore()
  const { user } = useUserStore()
  const [isCompleting, setIsCompleting] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [orderNumber, setOrderNumber] = useState<string | null>(null)

  useEffect(() => {
    const completeOrder = async () => {
      try {
        const checkoutId = localStorage.getItem('pendingCheckoutId')
        const paymentId = localStorage.getItem('pendingPaymentId')
        const paymentAmountStr = localStorage.getItem('pendingPaymentAmount')
        const paymentAmount = paymentAmountStr ? parseFloat(paymentAmountStr) : undefined
        const shippingAmountStr = localStorage.getItem('pendingShippingAmount')
        const shippingAmount = shippingAmountStr ? parseFloat(shippingAmountStr) : undefined
        const shippingCarrier = localStorage.getItem('pendingShippingCarrier') as
          | 'cdek'
          | 'yandex'
          | 'ozon'
          | null
        const lastCompletedOrderNumber = localStorage.getItem('lastCompletedOrderNumber')

        // Заказ уже оформлен в PaymentBlock — не вызываем complete повторно
        if (lastCompletedOrderNumber) {
          setOrderNumber(lastCompletedOrderNumber)
          trackPaymentSuccess({ paymentId, revenue: paymentAmount })
          localStorage.removeItem('lastCompletedOrderNumber')
          clearPendingCheckoutStorage()
          clearCart()
          clearCheckout()
          setIsCompleting(false)
          return
        }

        const accountEmail = getAccountEmail()
        const deliveryAddress = resolveCheckoutDeliveryAddress(
          useCheckoutStore.getState().deliveryAddress,
        )
        const checkoutContact = buildCheckoutContact({
          name: user.name,
          familyName: user.familyName,
          phone: user.phone,
        })

        if (!checkoutId) {
          if (paymentId && (await verifyPaymentSucceeded(paymentId))) {
            setError(
              'Оплата прошла, но заказ ещё обрабатывается. Подождите минуту и проверьте раздел «Заказы» в профиле. Если заказа нет — напишите в поддержку.',
            )
          } else {
            setError(
              'Не удалось подтвердить заказ. Если оплата прошла — свяжитесь с поддержкой.',
            )
          }
          setIsCompleting(false)
          return
        }

        const { completeCheckout } = await import('@/graphql/queries/cart.service')
        const orderResult = await completeCheckout(
          checkoutId,
          accountEmail,
          paymentAmount,
          paymentId || undefined,
          deliveryAddress,
          checkoutContact,
          shippingAmount,
          shippingCarrier,
        )

        if (orderResult.order?.number || orderResult.order?.id) {
          const number = String(orderResult.order.number || orderResult.order.id)
          setOrderNumber(number)
        }

        trackPaymentSuccess({
          paymentId,
          orderId: orderResult.order?.id,
          orderNumber: orderResult.order?.number,
          revenue: paymentAmount,
        })

        clearPendingCheckoutStorage()
        clearCart()
        clearCheckout()
        setIsCompleting(false)
      } catch (err: unknown) {
        console.error('Error completing checkout on success page:', err)
        const message =
          err instanceof Error ? err.message : 'Ошибка при завершении заказа'
        setError(message)
        setIsCompleting(false)
      }
    }

    void completeOrder()
  }, [clearCart, clearCheckout, user.name, user.familyName, user.phone])

  return (
    <div className="min-h-[calc(100vh-80px)] flex items-center justify-center px-4 py-12 text-center">
      <div className="w-full" style={{ maxWidth: '640px', margin: '0 auto' }}>
        {isCompleting ? (
          <>
            <h1 className="text-3xl sm:text-[36px] leading-tight font-semibold">
              Обработка заказа...
            </h1>
            <p className="mt-3 text-xs sm:text-sm text-gray-400">
              Пожалуйста, подождите
            </p>
          </>
        ) : error ? (
          <>
            <h1 className="text-3xl sm:text-[36px] leading-tight font-semibold text-red-600">
              Ошибка при обработке заказа
            </h1>
            <p className="mt-3 text-xs sm:text-sm text-red-400">
              {error}
            </p>
            <p className="mt-4 text-sm text-gray-600">
              Пожалуйста, свяжитесь с поддержкой, если оплата была успешной.
            </p>
            <div className="mt-6">
              <Link
                href="/profile?tab=my-orders"
                className="inline-flex items-center justify-center rounded-full px-6 py-2.5 text-sm font-medium bg-black text-white hover:bg-gray-900 transition-colors"
              >
                Проверить заказы в профиле
              </Link>
            </div>
          </>
        ) : (
          <>
            <h1 className="text-3xl sm:text-[36px] leading-tight font-semibold">
              Ваш заказ оформлен&nbsp;успешно!
            </h1>
            {orderNumber && (
              <p className="mt-2 text-sm text-gray-500">
                Номер заказа: {orderNumber}
              </p>
            )}
            <p className="mt-3 text-xs sm:text-sm text-gray-400">
              Спасибо, что выбираете ВСПОМНИ.
            </p>
          </>
        )}

        {!isCompleting && !error && (
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
        )}
      </div>
    </div>
  )
}

const CheckoutSuccessPage = () => {
  return (
    <Suspense fallback={
      <div className="min-h-[calc(100vh-80px)] flex items-center justify-center px-4 py-12 text-center">
        <div className="w-full" style={{ maxWidth: '640px', margin: '0 auto' }}>
          <h1 className="text-3xl sm:text-[36px] leading-tight font-semibold">
            Загрузка...
          </h1>
        </div>
      </div>
    }>
      <CheckoutSuccessContent />
    </Suspense>
  )
}

export default CheckoutSuccessPage

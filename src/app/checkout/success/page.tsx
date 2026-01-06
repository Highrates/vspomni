'use client'

import Link from 'next/link'
import { useEffect, useState, Suspense } from 'react'
import { useCartStore } from '@/stores/useCart'
import { useUserStore } from '@/stores/useUser'

const CheckoutSuccessContent = () => {
  const { clearCart } = useCartStore()
  const { user } = useUserStore()
  const [isCompleting, setIsCompleting] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const completeOrder = async () => {
      console.log('CheckoutSuccessContent: useEffect triggered')
      console.log('CheckoutSuccessContent: user.email =', user.email)
      
      try {
        // Получаем checkoutId и paymentId из localStorage
        const checkoutId = localStorage.getItem('pendingCheckoutId')
        const paymentId = localStorage.getItem('pendingPaymentId')
        const paymentAmountStr = localStorage.getItem('pendingPaymentAmount')
        const paymentAmount = paymentAmountStr ? parseFloat(paymentAmountStr) : undefined
        
        console.log('CheckoutSuccessContent: pendingCheckoutId from localStorage =', checkoutId)
        console.log('CheckoutSuccessContent: pendingPaymentId from localStorage =', paymentId)
        console.log('CheckoutSuccessContent: pendingPaymentAmount from localStorage =', paymentAmount)
        
        // Проверяем все ключи в localStorage для отладки
        console.log('CheckoutSuccessContent: All localStorage keys:', Object.keys(localStorage))
        
        if (!checkoutId) {
          console.warn('No pending checkoutId found in localStorage')
          setIsCompleting(false)
          return
        }

        console.log('Completing checkout on success page:', checkoutId)

        // Импортируем функцию завершения checkout
        const { completeCheckout } = await import('@/graphql/queries/cart.service')
        
        // Завершаем checkout (передаем paymentAmount и paymentId для создания transaction)
        const orderResult = await completeCheckout(checkoutId, user.email, paymentAmount, paymentId || undefined)
        console.log('Checkout completed on success page:', orderResult.order)

        if (orderResult.order) {
          console.log('Order created successfully:', {
            id: orderResult.order.id,
            number: orderResult.order.number,
            status: orderResult.order.status,
          })
        }

        // Очищаем checkoutId и paymentId из localStorage
        localStorage.removeItem('pendingCheckoutId')
        localStorage.removeItem('pendingPaymentId')
        localStorage.removeItem('pendingPaymentAmount')
        
        // Очищаем корзину
        clearCart()
        
        setIsCompleting(false)
      } catch (error: any) {
        console.error('Error completing checkout on success page:', error)
        setError(error.message || 'Ошибка при завершении заказа')
        setIsCompleting(false)
        // Не удаляем checkoutId из localStorage, чтобы можно было повторить попытку
      }
    }

    completeOrder()
  }, [user.email, clearCart])

  return (
    <div className="min-h-[calc(100vh-86px)] flex items-center justify-center px-4 py-12 text-center">
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
          </>
        ) : (
          <>
            <h1 className="text-3xl sm:text-[36px] leading-tight font-semibold">
              Ваш заказ оформлен&nbsp;успешно!
            </h1>
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
      <div className="min-h-[calc(100vh-86px)] flex items-center justify-center px-4 py-12 text-center">
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



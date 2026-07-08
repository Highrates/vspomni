'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useUserStore } from '@/stores/useUser'
import { useCartStore } from "@/stores/useCart"
import YooKassaWidget from '@/components/ui/YooKassaWidget'
import { createCart } from '@/graphql/queries/cart.service'
import { getSingleProduct } from '@/graphql/queries/product.service'
import { toast } from 'react-toastify'
import { isValidRuPhone } from '@/lib/ruPhone'

export default function PaymentBlock() {
  const [confirmationToken, setConfirmationToken] = useState<string | null>(null)
  const [showYooKassaWidget, setShowYooKassaWidget] = useState(false)
  const [isCreatingPayment, setIsCreatingPayment] = useState(false)
  const [checkoutId, setCheckoutId] = useState<string | null>(null)
  const [paymentId, setPaymentId] = useState<string | null>(null)
  const [paymentCompleted, setPaymentCompleted] = useState(false)
  const paymentCompletedRef = useRef(false)
  const { user } = useUserStore()
  const { items, totalPrice, appliedPromoCode } = useCartStore()

  const redirectToSuccess = useCallback(() => {
    window.location.assign('/checkout/success')
  }, [])

  const handleYooKassaSuccess = useCallback(async () => {
    if (paymentCompletedRef.current) return
    paymentCompletedRef.current = true
    setPaymentCompleted(true)

    const pendingCheckoutId = localStorage.getItem('pendingCheckoutId')
    const activeCheckoutId = pendingCheckoutId || checkoutId

    if (!activeCheckoutId) {
      redirectToSuccess()
      return
    }

    try {
      const { completeCheckout } = await import('@/graphql/queries/cart.service')
      const { clearCart } = useCartStore.getState()
      const paymentAmountStr = localStorage.getItem('pendingPaymentAmount')
      const paymentAmount = paymentAmountStr ? parseFloat(paymentAmountStr) : undefined
      const storedPaymentId = localStorage.getItem('pendingPaymentId') || paymentId || undefined

      await completeCheckout(
        activeCheckoutId,
        user.email,
        paymentAmount,
        storedPaymentId,
      )

      localStorage.removeItem('pendingCheckoutId')
      localStorage.removeItem('pendingPaymentId')
      localStorage.removeItem('pendingPaymentAmount')
      clearCart()
    } catch (error) {
      console.error('Error completing checkout after payment:', error)
      // Оставляем pendingCheckoutId — страница success повторит попытку
    }

    redirectToSuccess()
  }, [checkoutId, paymentId, redirectToSuccess, user.email])

  const handleCreateDraftOrder = async () => {
    try {
      setIsCreatingPayment(true)

      const checkoutLines = await Promise.all(
        items.map(async (item: any) => {
          let variantId = item.variantId

          if (!variantId && item.product.slug) {
            try {
              const productData = await getSingleProduct(item.product.slug)

              // Если товар по каналу недоступен для покупки — блокируем оформление
              if (productData && productData.isAvailableForPurchase === false) {
                throw new Error(
                  `Товар "${item.product.name}" закончился. ` +
                  `Пожалуйста, удалите его из корзины.`,
                )
              }

              if (productData?.productVariants?.edges) {
                const targetSize = item.size || item.product.size
                const matchingVariant = productData.productVariants.edges.find(
                  (edge) => edge.node.name === targetSize || edge.node.name === item.product.size
                )

                if (matchingVariant) {
                  variantId = matchingVariant.node.id
                  const updatedItems = items.map((i: any) =>
                    i.id === item.id ? { ...i, variantId } : i
                  )
                  useCartStore.setState({ items: updatedItems })
                } else {
                  const availableVariants = productData.productVariants.edges
                    .map(edge => edge.node.name)
                    .join(', ')

                  throw new Error(
                    `Вариант "${targetSize}" для товара "${item.product.name}" не найден. ` +
                    (availableVariants ? `Доступные варианты: ${availableVariants}` : 'Товар временно недоступен.')
                  )
                }
              }
            } catch (error) {
              console.error(`Failed to find variant for ${item.product.name}:`, error)
              throw error
            }
          }

          if (variantId && item.product.slug && !item.variantId) {
            try {
              const productData = await getSingleProduct(item.product.slug)

              // Повторный запрос: также проверяем общую доступность товара
              if (productData && productData.isAvailableForPurchase === false) {
                throw new Error(
                  `Товар "${item.product.name}" закончился. ` +
                  `Пожалуйста, удалите его из корзины.`,
                )
              }

              if (productData?.productVariants?.edges) {
                const variant = productData.productVariants.edges.find(
                  (edge) => edge.node.id === variantId
                )
                // Здесь намеренно НЕ смотрим на quantityAvailable, полагаемся
                // только на флаг доступности товара и нашу кастомную логику на бэкенде.
                void variant
              }
            } catch (error: any) {
              if (error.message && error.message.includes('недоступен')) {
                throw error
              }
            }
          }

          if (!variantId) {
            throw new Error(
              `Для товара "${item.product.name}" не указан вариант. ` +
              `Пожалуйста, удалите товар из корзины и добавьте его заново, выбрав размер.`
            )
          }

          return {
            variantId: variantId,
            quantity: item.quantity,
          }
        })
      )

      try {
        const checkoutResponse = await fetch('/api/saleor/create-order', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            lines: checkoutLines,
            userEmail: user.email,
            channel: 'vspomni-site',
          }),
        })

        const checkoutResult = await checkoutResponse.json()

        if (checkoutResponse.ok && checkoutResult.checkout) {
          // Checkout создан успешно без проверки наличия
          console.log('Checkout created via custom API:', checkoutResult.checkout)
          const newCheckoutId = checkoutResult.checkout.token as string

          // Синхронизируем промокод с реальным checkout в Saleor
          let checkoutTotalFromSaleor: number | null = null
          if (appliedPromoCode) {
            try {
              const { addPromoCodeService } = await import('@/graphql/queries/promocode.service')
              const checkoutWithPromo = await addPromoCodeService(
                appliedPromoCode,
                newCheckoutId,
              )
              if (checkoutWithPromo?.totalPrice?.gross?.amount != null) {
                checkoutTotalFromSaleor = checkoutWithPromo.totalPrice.gross.amount
              }
            } catch (promoError: any) {
              console.error('Failed to attach promo code to custom checkout:', promoError)
            }
          }

          console.log('Setting checkoutId state to:', newCheckoutId)
          setCheckoutId(newCheckoutId)
          const amountForPayment = checkoutTotalFromSaleor ?? totalPrice
          console.log('Calling handleCreatePayment with:', { newCheckoutId, amountForPayment })
          await handleCreatePayment(newCheckoutId, amountForPayment)
          return
        } else {
          // Если получили 504 или другую ошибку от кастомного API, не переходим к fallback
          // Показываем понятную ошибку пользователю
          if (checkoutResult.status === 504 || checkoutResponse.status === 504) {
            throw new Error(
              'Сервер не отвечает. Пожалуйста, попробуйте позже или обратитесь в поддержку.\n' +
              'Если проблема повторяется, возможно, требуется увеличить таймаут на сервере.'
            )
          }

          throw new Error(
            checkoutResult.message || checkoutResult.error ||
            'Ошибка создания заказа. Пожалуйста, попробуйте позже.'
          )
        }
      } catch (customError: any) {
        // Если это ошибка сети или таймаута, не переходим к fallback
        if (customError.message && (
          customError.message.includes('timeout') ||
          customError.message.includes('Gateway Time-out') ||
          customError.message.includes('504')
        )) {
          throw new Error(
            'Сервер не отвечает. Пожалуйста, попробуйте позже или обратитесь в поддержку.'
          )
        }

        // Для других ошибок тоже пробрасываем, не переходим к fallback
        // чтобы не использовать стандартный API с проверкой наличия
        console.error('Custom checkout creation error:', customError)
        throw customError
      }

      // Fallback: создаём checkout стандартным способом
      console.log('Creating checkout with:', {
        lines: checkoutLines,
        itemsCount: items.length
      })

      const checkoutResponse = await createCart(checkoutLines)
      const createdCheckout = checkoutResponse.checkoutCreate.checkout!
      if (
        checkoutResponse.checkoutCreate.errors &&
        checkoutResponse.checkoutCreate.errors.length > 0
      ) {
        const error = checkoutResponse.checkoutCreate.errors[0]
        console.error('Checkout creation error:', {
          message: error.message,
          code: error.code,
          field: error.field,
          fullError: error,
          allErrors: checkoutResponse.checkoutCreate.errors
        })

        let errorMessage = error.message || 'Failed to create checkout'

        if (errorMessage.includes('Only 0 remaining in stock') ||
          errorMessage.includes('remaining in stock') ||
          error.code === 'INSUFFICIENT_STOCK') {
          errorMessage = `Проблема с наличием товара в Saleor. ` +
            `В админ-панели Saleor проверьте:\n` +
            `1. Склад "Default Warehouse" привязан к каналу "vspomni-site"\n` +
            `2. Shipping zone включает нужную страну и привязан к каналу\n` +
            `3. Товар доступен для продажи в канале "vspomni-site"\n\n` +
            `Ошибка от Saleor: ${error.message}`
        }

        throw new Error(errorMessage)
      }

      const rawCheckoutId = createdCheckout.id
      if (!rawCheckoutId) {
        throw new Error('Checkout ID not received')
      }
      const newCheckoutId: string = rawCheckoutId

      let checkoutTotalFromSaleor: number | null =
        createdCheckout.totalPrice?.gross?.amount ?? null

      // Если есть применённый промокод — синхронизируем его с реальным checkout в Saleor
      if (appliedPromoCode) {
        try {
          const { addPromoCodeService } = (await import(
            '@/graphql/queries/promocode.service'
          )) as any
          const checkoutWithPromo = await addPromoCodeService(
            appliedPromoCode,
            newCheckoutId,
          )
          const promoTotal =
            checkoutWithPromo?.totalPrice?.gross?.amount ?? null
          if (promoTotal !== null) {
            checkoutTotalFromSaleor = promoTotal
          }
        } catch (promoError: any) {
          console.error('Failed to attach promo code to checkout:', promoError)
          // продолжаем без промокода, чтобы не падать перед оплатой
        }
      }

      const checkoutId = newCheckoutId!
      setCheckoutId(checkoutId)
      const amountForPayment = checkoutTotalFromSaleor ?? totalPrice
      await handleCreatePayment(checkoutId, amountForPayment)
    } catch (error: any) {
      console.error('Error creating checkout:', error)
      let errorMessage = error.message || 'Ошибка создания заказа'
      if (
        errorMessage.includes('метод оплаты') &&
        errorMessage.toLowerCase().includes('недоступен')
      ) {
        errorMessage =
          'Метод оплаты недоступен. В админке Saleor: Настройки → Каналы → vspomni-site → Способы оплаты — включите хотя бы один способ (Dummy или плагин ЮKassa).'
      } else if (errorMessage.includes('Failed to create checkout')) {
        errorMessage = 'Не удалось создать заказ. Пожалуйста, попробуйте позже.'
      }
      toast.error(errorMessage)
      setIsCreatingPayment(false)
    }
  }

  const handleCreatePayment = async (orderOrCheckoutId: string, amountOverride?: number) => {
    setIsCreatingPayment(true)
    try {
      // Вычисляем общую сумму заказа: приоритетно берём сумму из checkout (amountOverride),
      // чтобы она совпадала с тем, что знает Saleor
      const totalAmount = amountOverride ?? totalPrice

      // Описание заказа
      const shortId = orderOrCheckoutId.length > 8
        ? orderOrCheckoutId.substring(orderOrCheckoutId.length - 8)
        : orderOrCheckoutId
      const description = `Заказ #${shortId} - ${items.length} товар(ов)`

      // Вызываем API для создания платежа
      const response = await fetch('/api/yookassa/create-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: totalAmount,
          currency: 'RUB',
          description: description,
          orderId: orderOrCheckoutId,
          userEmail: user.email,
          items: items.map((item: any) => ({
            name: item.product.name,
            quantity: item.quantity,
            price: item.price,
            sku: item.variantId || item.id,
          })),
          returnUrl: `${window.location.origin}/checkout/success`,
          metadata: {
            userId: user.email,
            orderId: orderOrCheckoutId,
            itemsCount: items.length,
          },
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create payment')
      }

      if (result.confirmationToken) {
        // Сохраняем checkoutId и paymentId в localStorage для использования на странице success
        // Используем orderOrCheckoutId, который передан в функцию
        localStorage.setItem('pendingCheckoutId', orderOrCheckoutId)
        if (result.paymentId) {
          localStorage.setItem('pendingPaymentId', result.paymentId)
          localStorage.setItem('pendingPaymentAmount', totalAmount.toString())
        }
        console.log('Saved checkoutId to localStorage:', orderOrCheckoutId)
        console.log('Saved paymentId to localStorage:', result.paymentId)
        console.log('Current checkoutId state:', checkoutId)

        setConfirmationToken(result.confirmationToken)
        if (result.paymentId) {
          setPaymentId(result.paymentId)
        }
        setShowYooKassaWidget(true)
      } else {
        throw new Error('No confirmation token received')
      }
    } catch (error: any) {
      console.error('Error creating payment:', error)
      let errorMessage = error.message || 'Ошибка создания платежа. Пожалуйста, попробуйте позже.'
      if (
        errorMessage.includes('метод оплаты') &&
        errorMessage.toLowerCase().includes('недоступен')
      ) {
        errorMessage =
          'Метод оплаты недоступен. Проверьте в личном кабинете ЮKassa: способы оплаты и валюту RUB для магазина.'
      }
      toast.error(errorMessage)
    } finally {
      setIsCreatingPayment(false)
    }
  }

  const handleYooKassaError = (error: any) => {
    console.error('Payment error:', error)
    toast.error('Ошибка при оплате. Попробуйте ещё раз.')
  }

  const checkPaymentStatus = useCallback(async () => {
    if (!paymentId || paymentCompletedRef.current) return false
    try {
      const response = await fetch(
        `/api/yookassa/payment-status?paymentId=${encodeURIComponent(paymentId)}`,
      )
      if (!response.ok) return false
      const data = await response.json()
      if (data.status === 'succeeded' || data.paid) {
        await handleYooKassaSuccess()
        return true
      }
    } catch {
      // ignore polling errors
    }
    return false
  }, [paymentId, handleYooKassaSuccess])

  useEffect(() => {
    if (!paymentId || paymentCompleted) return

    const interval = window.setInterval(() => {
      if (paymentCompletedRef.current) return
      void checkPaymentStatus()
    }, 4000)

    return () => window.clearInterval(interval)
  }, [paymentId, paymentCompleted, checkPaymentStatus])

  return (
    <section className="select-none">
      <h2 className="text-2xl sm:text-3xl md:text-[32px] leading-tight font-semibold mb-4 sm:mb-5 md:mb-6">Оплата</h2>

      {/* Виджет ЮKassa - показывается когда доступен confirmation_token */}
      {showYooKassaWidget && confirmationToken && (
        <div className="mb-4 sm:mb-5 md:mb-6">
          <YooKassaWidget
            confirmationToken={confirmationToken}
            paymentId={paymentId}
            onSuccess={handleYooKassaSuccess}
            onError={handleYooKassaError}
            onClose={() => setShowYooKassaWidget(false)}
          />
        </div>
      )}

      {paymentId && !paymentCompleted && (
        <button
          type="button"
          onClick={() => void checkPaymentStatus()}
          className="w-full rounded-full border border-black/15 px-4 py-2.5 text-sm font-medium text-black/70 hover:bg-black/5 transition mb-4 sm:mb-5 md:mb-6"
        >
          Оплата прошла? Перейти к подтверждению заказа
        </button>
      )}

      {!showYooKassaWidget && !paymentId && (
      <button
        type="button"
        className="w-full h-12 sm:h-13 md:h-14 rounded-full bg-black text-white text-base sm:text-[17px] md:text-[18px] font-semibold hover:bg-[#3A7FE2] transition disabled:bg-gray-400"
        disabled={
          isCreatingPayment ||
          !Boolean(
            user.name.length > 2 &&
            user.familyName.length > 0 &&
            user.email.length > 5 &&
            user.email.includes('@') &&
            isValidRuPhone(user.phone),
          )
        }
        onClick={handleCreateDraftOrder}
      >
        {isCreatingPayment ? 'Создание платежа...' : 'Оплатить'}
      </button>
      )}
    </section>
  )
}

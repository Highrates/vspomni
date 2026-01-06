'use client'

import { useState } from 'react'
import { useUserStore } from '@/stores/useUser'
import { useCartStore } from "@/stores/useCart"
import YooKassaWidget from '@/components/ui/YooKassaWidget'
import { createCart } from '@/graphql/queries/cart.service'
import { getSingleProduct } from '@/graphql/queries/product.service'
import { toast } from 'react-toastify'

export default function PaymentBlock() {
  const [confirmationToken, setConfirmationToken] = useState<string | null>(null)
  const [showYooKassaWidget, setShowYooKassaWidget] = useState(false)
  const [isCreatingPayment, setIsCreatingPayment] = useState(false)
  const [checkoutId, setCheckoutId] = useState<string | null>(null)
  const { user } = useUserStore()
  const { items, totalPrice, appliedPromoCode } = useCartStore()

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
      // Улучшаем сообщения об ошибках
      if (errorMessage.includes('Failed to create checkout')) {
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
        setShowYooKassaWidget(true)
      } else {
        throw new Error('No confirmation token received')
      }
    } catch (error: any) {
      console.error('Error creating payment:', error)
      const errorMessage = error.message || 'Ошибка создания платежа. Пожалуйста, попробуйте позже.'
      toast.error(errorMessage)
    } finally {
      setIsCreatingPayment(false)
    }
  }

  const handleYooKassaSuccess = async (result: any) => {
    console.log('Payment successful (callback):', result)
    console.log('Current checkoutId:', checkoutId)
    console.log('Current user email:', user.email)
    
    // Если checkoutId есть в localStorage, значит мы уже обрабатываем на странице success
    // Не дублируем вызов completeCheckout здесь
    const pendingCheckoutId = localStorage.getItem('pendingCheckoutId')
    if (pendingCheckoutId && pendingCheckoutId === checkoutId) {
      console.log('Checkout completion will be handled on success page')
      // Просто редиректим, обработка будет на странице success
      window.location.href = '/checkout/success'
      return
    }
    
    // Завершаем checkout после успешной оплаты (fallback, если не сработал редирект)
    if (checkoutId) {
      try {
        console.log('Starting checkout completion in callback...')
        const { completeCheckout } = await import('@/graphql/queries/cart.service')
        const { clearCart } = useCartStore.getState()
        
        // Передаем email пользователя для связывания checkout с пользователем
        console.log('Calling completeCheckout with:', { checkoutId, email: user.email })
        const orderResult = await completeCheckout(checkoutId, user.email)
        console.log('Checkout completed in callback, order created:', orderResult.order)
        
        if (orderResult.order) {
          console.log('Order details:', {
            id: orderResult.order.id,
            number: orderResult.order.number,
            status: orderResult.order.status,
            statusDisplay: orderResult.order.statusDisplay,
          })
        } else {
          console.warn('No order returned from completeCheckout')
        }
        
        // Очищаем checkoutId из localStorage
        localStorage.removeItem('pendingCheckoutId')
        
        // Очищаем корзину после успешного заказа
        clearCart()
        
        // Редирект на страницу успеха
        window.location.href = '/checkout/success'
      } catch (error: any) {
        console.error('Error completing checkout in callback:', error)
        console.error('Error details:', {
          message: error.message,
          stack: error.stack,
          checkoutId,
          userEmail: user.email,
        })
        // Не показываем ошибку пользователю, так как оплата уже прошла
        // Просто редиректим на success, там будет повторная попытка
        window.location.href = '/checkout/success'
      }
    } else {
      console.warn('No checkoutId available, cannot complete checkout')
      // Если нет checkoutId, просто редиректим
      window.location.href = '/checkout/success'
    }
  }

  const handleYooKassaError = (error: any) => {
    console.error('Payment error:', error)
    // Обработка ошибки оплаты
  } 

  return (
    <section className="select-none">
      <h2 className="text-2xl sm:text-3xl md:text-[32px] leading-tight font-semibold mb-4 sm:mb-5 md:mb-6">Оплата</h2>

      {/* Виджет ЮKassa - показывается когда доступен confirmation_token */}
      {showYooKassaWidget && confirmationToken && (
        <div className="mb-4 sm:mb-5 md:mb-6">
          <YooKassaWidget
            confirmationToken={confirmationToken}
            returnUrl={`${typeof window !== 'undefined' ? window.location.origin : ''}/checkout/success`}
            onSuccess={handleYooKassaSuccess}
            onError={handleYooKassaError}
            onClose={() => setShowYooKassaWidget(false)}
          />
        </div>
      )}

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
              user.phone.length > 0,
          )
        }
        onClick={handleCreateDraftOrder}
      >
        {isCreatingPayment ? 'Создание платежа...' : 'Оплатить'}
      </button>
    </section>
  )
}

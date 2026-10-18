'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useUserStore } from '@/stores/useUser'
import { useCheckoutStore } from '@/stores/useCheckout'
import { useCartStore } from "@/stores/useCart"
import YooKassaWidget from '@/components/ui/YooKassaWidget'
import { toast } from 'react-toastify'
import { formatCurrency } from '@/lib/functions'
import { isValidRuPhone } from '@/lib/ruPhone'
import { getAccountEmail } from '@/lib/auth/accountEmail'
import {
  buildCheckoutContact,
  resolveCheckoutDeliveryAddress,
} from '@/lib/checkout/deliveryAddress'
import {
  CheckoutError,
  clearPendingCheckoutOrder,
  prepareNestPayment,
} from '@/lib/checkout/nestCheckout'
import { fetchPaymentStatus } from '@/lib/checkout/postPayment'
import {
  describeCartSyncChanges,
  syncCartWithNest,
} from '@/lib/cart/syncCart'

/**
 * Оплата через Nest: syncCart → shipping-quote → create order → pay → YooKassa widget.
 * Успех фиксирует Nest (webhook / checkout-status), см. `lib/checkout/nestCheckout.ts`.
 */
export default function PaymentBlock() {
  const [confirmationToken, setConfirmationToken] = useState<string | null>(null)
  const [showYooKassaWidget, setShowYooKassaWidget] = useState(false)
  const [isCreatingPayment, setIsCreatingPayment] = useState(false)
  const [orderId, setOrderId] = useState<string | null>(null)
  const [orderNumber, setOrderNumber] = useState<string | null>(null)
  const [payToken, setPayToken] = useState<string | null>(null)
  const [paymentId, setPaymentId] = useState<string | null>(null)
  const [paymentCompleted, setPaymentCompleted] = useState(false)
  const paymentCompletedRef = useRef(false)
  const { user } = useUserStore()
  const deliveryAddress = useCheckoutStore((s) => s.deliveryAddress)
  const { items, shippingPrice, shippingCarrier, shippingLoading, shippingError, shippingIsFree } = useCartStore()

  const getCheckoutContact = useCallback(
    () =>
      buildCheckoutContact({
        name: user.name,
        familyName: user.familyName,
        phone: user.phone,
      }),
    [user.name, user.familyName, user.phone],
  )

  const redirectToSuccess = useCallback(
    (id?: string | null, number?: string | null) => {
      const qs = new URLSearchParams()
      if (id) qs.set('orderId', id)
      if (number) qs.set('number', number)
      const q = qs.toString()
      window.location.assign(q ? `/checkout/success?${q}` : '/checkout/success')
    },
    [],
  )

  const handleYooKassaSuccess = useCallback(async () => {
    if (paymentCompletedRef.current) return
    paymentCompletedRef.current = true
    setPaymentCompleted(true)
    redirectToSuccess(orderId, orderNumber)
  }, [orderId, orderNumber, redirectToSuccess])

  const handleCreateDraftOrder = async () => {
    try {
      setIsCreatingPayment(true)

      const {
        shippingPrice: currentShippingPrice,
        shippingLoading: isShippingLoading,
        shippingError: currentShippingError,
        shippingCarrier: currentShippingCarrier,
        shippingIsFree: currentShippingIsFree,
        appliedPromoCode: currentPromo,
      } = useCartStore.getState()

      if (isShippingLoading) {
        toast.error('Подождите, идёт расчёт стоимости доставки.')
        return
      }

      if (currentShippingError) {
        toast.error(currentShippingError)
        return
      }

      if (
        currentShippingCarrier &&
        currentShippingPrice <= 0 &&
        !currentShippingIsFree
      ) {
        toast.error(
          'Не удалось рассчитать доставку. Проверьте адрес или попробуйте позже.',
        )
        return
      }

      const resolvedDelivery = resolveCheckoutDeliveryAddress(deliveryAddress)
      if (!resolvedDelivery) {
        toast.error('Выберите адрес доставки перед оплатой.')
        return
      }

      // 1) Живые цены/наличие из Nest: товары без остатка убираем, изменения показываем до оплаты
      const sync = await syncCartWithNest({ throwOnError: true })
      const syncMessage = describeCartSyncChanges(sync)
      if (sync.items.length === 0) {
        toast.error(syncMessage || 'Корзина пуста или товары закончились.')
        return
      }
      if (sync.changed) {
        toast.warn(
          `${syncMessage}. Проверьте итог и нажмите «Оплатить» ещё раз.`,
        )
        return
      }

      const accountEmail = getAccountEmail()
      const guestEmail = useUserStore.getState().user.email?.trim().toLowerCase() || ''
      const email = accountEmail || guestEmail
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        toast.error('Укажите корректный email для заказа.')
        return
      }

      const contact = getCheckoutContact()
      const customerName =
        [contact.firstName, contact.lastName].filter(Boolean).join(' ').trim() ||
        resolvedDelivery.firstName ||
        'Покупатель'

      // 2–4) shipping-quote → create → pay
      const prepared = await prepareNestPayment({
        items: useCartStore.getState().items,
        email,
        phone: contact.phone || resolvedDelivery.phone || '',
        customerName,
        address: resolvedDelivery,
        contact,
        promoCode: currentPromo,
        shippingEstimate: currentShippingPrice,
        shippingFree: currentShippingIsFree,
        carrier: currentShippingCarrier,
      })

      const { order, pay } = prepared
      setOrderId(order.id)
      setOrderNumber(order.number)
      setPayToken(order.payToken)

      if (pay.alreadyPaid) {
        paymentCompletedRef.current = true
        setPaymentCompleted(true)
        redirectToSuccess(order.id, order.number)
        return
      }

      if (!pay.confirmationToken) {
        throw new Error('Nest не вернул confirmationToken для виджета оплаты')
      }

      const cartTotal = useCartStore.getState().totalPrice
      if (Math.abs((order.total || 0) - cartTotal) >= 1) {
        toast.info(`Итог пересчитан магазином: ${formatCurrency(order.total)} ₽`)
      }

      setConfirmationToken(pay.confirmationToken)
      if (pay.paymentId) setPaymentId(pay.paymentId)
      setShowYooKassaWidget(true)
    } catch (error: unknown) {
      console.error('Error creating checkout:', error)
      if (error instanceof CheckoutError) {
        if (error.code === 'SHIPPING_CHANGED' && error.extra?.shippingCost != null) {
          // Nest — источник правды по доставке: подставляем и просим подтвердить итог
          const cost = error.extra.shippingCost
          useCartStore.getState().setShippingPrice(cost)
          useCartStore.getState().setShippingIsFree(cost === 0)
          toast.warn(error.message)
        } else if (error.code === 'PROMO_REJECTED') {
          const code = useCartStore.getState().appliedPromoCode ?? ''
          useCartStore
            .getState()
            .removePromoCode(`Промокод ${code} снят: ${error.message}`)
          clearPendingCheckoutOrder()
          toast.error(
            `Промокод не применён: ${error.message}. Итог пересчитан — проверьте сумму и нажмите «Оплатить» ещё раз.`,
          )
        } else if (error.code === 'CART_CHANGED') {
          void syncCartWithNest()
          toast.error(error.message)
        } else {
          toast.error(error.message)
        }
      } else {
        const message =
          error instanceof Error ? error.message : 'Ошибка создания заказа'
        toast.error(
          /failed to fetch|networkerror/i.test(message)
            ? 'Сервер не отвечает. Пожалуйста, попробуйте позже или обратитесь в поддержку.'
            : message,
        )
      }
    } finally {
      setIsCreatingPayment(false)
    }
  }

  const handleYooKassaError = (error: unknown) => {
    console.error('Payment error:', error)
    toast.error('Ошибка при оплате. Попробуйте ещё раз.')
  }

  const checkPaymentStatus = useCallback(async () => {
    if (!paymentId || paymentCompletedRef.current) return false
    try {
      const data = await fetchPaymentStatus(paymentId, payToken)
      if (data?.status === 'succeeded' || data?.paid) {
        await handleYooKassaSuccess()
        return true
      }
    } catch {
      // ignore polling errors
    }
    return false
  }, [paymentId, payToken, handleYooKassaSuccess])

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
            payToken={payToken}
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

      {/* После закрытия виджета повторный «Оплатить» переиспользует тот же заказ (pending по signature) */}
      {!showYooKassaWidget && !paymentCompleted && (
      <>
      {shippingError ? (
        <p className="mb-3 text-sm text-red-600">{shippingError}</p>
      ) : shippingLoading ? (
        <p className="mb-3 text-sm text-black/50">Расчёт доставки…</p>
      ) : null}
      <button
        type="button"
        className="w-full h-12 sm:h-13 md:h-14 rounded-full bg-black text-white text-base sm:text-[17px] md:text-[18px] font-semibold hover:bg-[#3A7FE2] transition disabled:bg-gray-400"
        disabled={
          isCreatingPayment ||
          shippingLoading ||
          Boolean(shippingError) ||
          Boolean(shippingCarrier && shippingPrice <= 0 && !shippingIsFree) ||
          !deliveryAddress ||
          !Boolean(
            user.name.trim().length >= 2 &&
            user.familyName.trim().length >= 1 &&
            /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
              getAccountEmail() || user.email?.trim().toLowerCase() || '',
            ) &&
            isValidRuPhone(user.phone),
          )
        }
        onClick={handleCreateDraftOrder}
      >
        {isCreatingPayment ? 'Создание платежа...' : 'Оплатить'}
      </button>
      </>
      )}
    </section>
  )
}

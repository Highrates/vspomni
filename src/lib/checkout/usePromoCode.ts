'use client'

import { useCallback, useEffect, useState } from 'react'
import { useCartStore } from '@/stores/useCart'
import { getAccountEmail } from '@/lib/auth/accountEmail'
import { cartSignature, describePromo, PROMO_REVALIDATE_AFTER_MS } from '@/lib/promo'
import { PromoCodeError, validatePromoCode } from '@/graphql/queries/promocode.service'

const REVALIDATE_DEBOUNCE_MS = 600

let inFlightKey: string | null = null

function currentValidationOptions() {
  const { shippingPrice, shippingCarrier } = useCartStore.getState()
  return {
    email: getAccountEmail(),
    shippingAmount: shippingPrice > 0 ? shippingPrice : undefined,
    shippingCarrier,
  }
}

/** Перепроверяет применённый промокод для текущего состава корзины. */
export async function revalidateAppliedPromo(): Promise<void> {
  const state = useCartStore.getState()
  const code = state.appliedPromoCode
  if (!code) return
  if (state.items.length === 0) {
    state.removePromoCode()
    return
  }

  const signature = cartSignature(state.items)
  const key = `${code}|${signature}`
  if (inFlightKey === key) return
  inFlightKey = key

  try {
    const result = await validatePromoCode(code, state.items, currentValidationOptions())
    if (useCartStore.getState().appliedPromoCode !== code) return
    useCartStore.getState().applyPromoCode(result, signature)
  } catch (error) {
    if (useCartStore.getState().appliedPromoCode !== code) return
    if (error instanceof PromoCodeError && error.rejected) {
      useCartStore.getState().removePromoCode(`Промокод ${code} снят: ${error.message}`)
    }
  } finally {
    if (inFlightKey === key) inFlightKey = null
  }
}

/**
 * Общая логика полей промокода в корзине и на checkout: применение, снятие и
 * перепроверка при изменении корзины или устаревании сохранённого промокода.
 */
export function usePromoCode() {
  const [promoCode, setPromoCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const items = useCartStore((s) => s.items)
  const appliedPromoCode = useCartStore((s) => s.appliedPromoCode)
  const discountType = useCartStore((s) => s.discountType)
  const discountValueType = useCartStore((s) => s.discountValueType)
  const discountValue = useCartStore((s) => s.discountValue)
  const promoScope = useCartStore((s) => s.promoScope)
  const promoCartSignature = useCartStore((s) => s.promoCartSignature)
  const promoValidatedAt = useCartStore((s) => s.promoValidatedAt)
  const promoNotice = useCartStore((s) => s.promoNotice)
  const applyPromoCode = useCartStore((s) => s.applyPromoCode)
  const removePromoCode = useCartStore((s) => s.removePromoCode)
  const setPromoNotice = useCartStore((s) => s.setPromoNotice)

  useEffect(() => {
    if (!appliedPromoCode) return
    const stale =
      promoCartSignature !== cartSignature(items) ||
      !promoValidatedAt ||
      Date.now() - promoValidatedAt > PROMO_REVALIDATE_AFTER_MS
    if (!stale) return
    const timer = setTimeout(() => {
      void revalidateAppliedPromo()
    }, REVALIDATE_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [appliedPromoCode, items, promoCartSignature, promoValidatedAt])

  const apply = useCallback(async () => {
    const code = promoCode.trim()
    if (!code) {
      setError('Введите промокод')
      return
    }
    if (appliedPromoCode) {
      setError('Промокод уже применён. Сначала удалите текущий промокод.')
      return
    }

    setIsLoading(true)
    setError(null)
    setPromoNotice(null)
    try {
      const cartItems = useCartStore.getState().items
      const result = await validatePromoCode(code, cartItems, currentValidationOptions())
      applyPromoCode(result, cartSignature(cartItems))
      setPromoCode('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось применить промокод')
    } finally {
      setIsLoading(false)
    }
  }, [promoCode, appliedPromoCode, applyPromoCode, setPromoNotice])

  const remove = useCallback(() => {
    removePromoCode()
    setError(null)
  }, [removePromoCode])

  const changeCode = useCallback((value: string) => {
    setPromoCode(value)
    setError(null)
  }, [])

  const appliedText = describePromo({
    appliedPromoCode,
    discountType,
    discountValueType,
    discountValue,
    promoScope,
  })

  return {
    promoCode,
    setPromoCode: changeCode,
    isLoading,
    error: error ?? promoNotice,
    appliedPromoCode,
    appliedText,
    apply,
    remove,
  }
}

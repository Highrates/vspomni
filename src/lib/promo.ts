import type { CartItem } from '@/types/cart'
import { formatCurrency } from '@/lib/functions'

export type PromoDiscountType = 'PERCENTAGE' | 'FIXED' | 'SHIPPING'
export type PromoValueType = 'PERCENTAGE' | 'FIXED'
/** ORDER — весь заказ, PRODUCTS — отдельные товары, CHEAPEST — один самый дешёвый товар */
export type PromoScope = 'ORDER' | 'PRODUCTS' | 'CHEAPEST' | 'SHIPPING'

export interface PromoState {
  appliedPromoCode: string | null
  discountType?: PromoDiscountType
  discountValueType?: PromoValueType
  discountValue?: number
  promoScope?: PromoScope
  /** Скидка на товары, рассчитанная Saleor для корзины с подписью promoCartSignature */
  discountAmount?: number
  promoCartSignature?: string | null
}

/** Ответ /voucher/validate/ */
export interface PromoValidationResult {
  code: string
  discountType: PromoDiscountType
  discountValueType: PromoValueType
  discountValue: number
  /** Скидка на товары для отправленного состава корзины (0 для промокода на доставку) */
  discountAmount: number
  scope: PromoScope
  minSpent: number | null
}

/** Перепроверять сохранённый промокод не реже, чем раз в 10 минут */
export const PROMO_REVALIDATE_AFTER_MS = 10 * 60 * 1000

export const round2 = (value: number) => Math.round(value * 100) / 100

export function cartSignature(items: CartItem[]): string {
  return items
    .filter((item) => item.product)
    .map((item) => `${item.variantId || item.id}:${item.quantity}`)
    .sort()
    .join('|')
}

export function cartSubtotal(items: CartItem[]): number {
  return items
    .filter((item) => item.product && typeof item.product.price === 'number')
    .reduce((sum, item) => sum + item.product.price * item.quantity, 0)
}

/**
 * Скидка на товары. Точная сумма приходит с бэкенда для конкретного состава корзины;
 * пока корзина изменилась и промокод перепроверяется, показываем оценку.
 */
export function promoItemsDiscount(
  promo: PromoState,
  items: CartItem[],
  subtotal: number,
): number {
  if (!promo.appliedPromoCode || promo.discountType === 'SHIPPING') return 0

  const serverAmount = Number(promo.discountAmount) || 0
  if (promo.promoCartSignature && promo.promoCartSignature === cartSignature(items)) {
    return Math.min(serverAmount, subtotal)
  }

  const value = Number(promo.discountValue) || 0
  if (promo.promoScope === 'ORDER') {
    if (promo.discountValueType === 'PERCENTAGE') return round2((subtotal * value) / 100)
    if (promo.discountValueType === 'FIXED') return Math.min(value, subtotal)
  }
  return Math.min(serverAmount, subtotal)
}

export function promoShippingDiscount(promo: PromoState, shippingPrice: number): number {
  if (!promo.appliedPromoCode || promo.discountType !== 'SHIPPING') return 0
  const shipping = Math.max(0, Number(shippingPrice) || 0)
  const value = Number(promo.discountValue) || 0
  if (promo.discountValueType === 'PERCENTAGE') {
    return Math.min(shipping, round2((shipping * value) / 100))
  }
  return Math.min(shipping, value)
}

export function isFreeShippingPromo(promo: PromoState): boolean {
  return (
    promo.discountType === 'SHIPPING' &&
    promo.discountValueType === 'PERCENTAGE' &&
    (Number(promo.discountValue) || 0) >= 100
  )
}

export function describePromo(promo: PromoState): string {
  const code = promo.appliedPromoCode
  if (!code) return ''
  const value = Number(promo.discountValue) || 0
  const amount =
    promo.discountValueType === 'PERCENTAGE' ? `${value}%` : `${formatCurrency(value)} ₽`

  if (promo.discountType === 'SHIPPING') {
    return isFreeShippingPromo(promo)
      ? `${code} — бесплатная доставка`
      : `${code} — скидка ${amount} на доставку`
  }

  const scopeSuffix =
    promo.promoScope === 'PRODUCTS'
      ? ' на часть товаров'
      : promo.promoScope === 'CHEAPEST'
        ? ' на один товар'
        : ''
  return `${code} — скидка ${amount}${scopeSuffix}`
}

import type { CartItem } from '@/types/cart'
import { formatCurrency } from '@/lib/functions'

/** Nest `PromoCodeType`: PERCENT | FIXED (Saleor SHIPPING удалён). */
export type PromoDiscountType = 'PERCENTAGE' | 'FIXED'
export type PromoValueType = 'PERCENTAGE' | 'FIXED'
/** Nest scope: null → ORDER, CATEGORY|PRODUCTS → PRODUCTS (UI). */
export type PromoScope = 'ORDER' | 'PRODUCTS'

/**
 * Front до релиза сертификатов: только промокоды (`POST /promo/validate`).
 * Gift validate / dual-input / giftCertificateCode / purchase page — после релиза.
 */
export const PROMO_ONLY = true as const

export interface PromoState {
  appliedPromoCode: string | null
  discountType?: PromoDiscountType
  discountValueType?: PromoValueType
  discountValue?: number
  promoScope?: PromoScope
  /** Скидка на товары, рассчитанная бэкендом для корзины с подписью promoCartSignature */
  discountAmount?: number
  promoCartSignature?: string | null
}

/** Результат проверки промокода (Nest `POST /promo/validate`, см. mapNestPromoToValidation) */
export interface PromoValidationResult {
  code: string
  discountType: PromoDiscountType
  discountValueType: PromoValueType
  discountValue: number
  /** Скидка на товары для отправленного состава корзины */
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
  if (!promo.appliedPromoCode) return 0

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

export function describePromo(promo: PromoState): string {
  const code = promo.appliedPromoCode
  if (!code) return ''
  const value = Number(promo.discountValue) || 0
  const amount =
    promo.discountValueType === 'PERCENTAGE' ? `${value}%` : `${formatCurrency(value)} ₽`

  const scopeSuffix = promo.promoScope === 'PRODUCTS' ? ' на часть товаров' : ''
  return `${code} — скидка ${amount}${scopeSuffix}`
}

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { CartItem } from '@/types/cart'
import { ProductCardItem } from '@/types/product'
import {
  effectiveMaxQuantity,
  formatMaxQuantityMessage,
} from '@/lib/product/quantityLimit'
import {
  cartSignature,
  cartSubtotal,
  promoItemsDiscount,
  round2,
  type PromoDiscountType,
  type PromoScope,
  type PromoValidationResult,
  type PromoValueType,
} from '@/lib/promo'

export type CartQuantityResult =
  | { ok: true }
  | { ok: false; reason: 'limit'; message: string; maxQuantity: number }

interface CartState {
  items: CartItem[]
  totalItems: number
  totalPrice: number
  /** Процент скидки промокода (только для процентных промокодов на товары) */
  discount: number
  /** Скидка на товары, рассчитанная бэкендом для корзины с подписью promoCartSignature */
  discountAmount?: number
  discountType?: PromoDiscountType
  discountValueType?: PromoValueType
  discountValue?: number
  promoScope?: PromoScope
  promoCartSignature?: string | null
  promoValidatedAt?: number | null
  /** Сообщение, почему промокод был снят или изменён */
  promoNotice: string | null
  promoItemsDiscount: number
  shippingPrice: number
  shippingLoading: boolean
  /** Ошибка расчёта доставки — блокирует оплату */
  shippingError: string | null
  /** Легитимная бесплатная доставка (промо / carrier=0), не ошибка расчёта */
  shippingIsFree: boolean
  /** Как считалась доставка на checkout (по метке в адресе) */
  shippingCarrier: 'cdek' | 'yandex' | 'ozon' | null
  appliedPromoCode: string | null

  addItem: (
    product: ProductCardItem,
    quantity: number,
    size: string,
    variantId?: string,
  ) => CartQuantityResult
  removeItem: (id: string) => void
  /** Заменить строки целиком (результат Nest cart sync); пересчитывает итоги. */
  replaceItems: (items: CartItem[]) => void
  increaseQuantity: (id: string) => CartQuantityResult
  decreaseQuantity: (id: string) => void
  clearCart: () => void
  setShippingPrice: (price: number) => void
  setShippingLoading: (loading: boolean) => void
  setShippingError: (message: string | null) => void
  setShippingIsFree: (isFree: boolean) => void
  setShippingCarrier: (carrier: 'cdek' | 'yandex' | 'ozon' | null) => void
  /** cartSig — подпись корзины, для которой бэкенд посчитал discountAmount */
  applyPromoCode: (result: PromoValidationResult, cartSig?: string) => void
  removePromoCode: (notice?: string | null) => void
  setPromoNotice: (notice: string | null) => void
}

type TotalsInput = Pick<
  CartState,
  | 'items'
  | 'shippingPrice'
  | 'discountType'
  | 'discountValueType'
  | 'discountValue'
  | 'promoScope'
  | 'discountAmount'
  | 'promoCartSignature'
> & { appliedPromoCode: string | null }

const calcTotals = (state: TotalsInput) => {
  // защитимся от старых/битых записей в localStorage,
  // где product мог быть undefined или без price
  const validItems = state.items.filter((i) => i.product && typeof i.product.price === 'number')
  const subtotal = cartSubtotal(validItems)
  const shippingPrice = Number(state.shippingPrice) || 0
  const itemsDiscount = promoItemsDiscount(state, validItems, subtotal)

  return {
    totalItems: validItems.reduce((sum, i) => sum + i.quantity, 0),
    totalPrice: round2(subtotal - itemsDiscount + shippingPrice),
    promoItemsDiscount: itemsDiscount,
  }
}

const EMPTY_PROMO = {
  appliedPromoCode: null,
  discount: 0,
  discountAmount: undefined,
  discountType: undefined,
  discountValueType: undefined,
  discountValue: undefined,
  promoScope: undefined,
  promoCartSignature: null,
  promoValidatedAt: null,
} as const

function resolveItemMaxQuantity(product?: ProductCardItem): number | null {
  return effectiveMaxQuantity(
    product?.quantityLimitPerCustomer,
    product?.quantityAvailable,
  )
}

function clampCartItems(items: CartItem[]): CartItem[] {
  return items.map((item) => {
    const max = resolveItemMaxQuantity(item.product)
    if (max == null || item.quantity <= max) return item
    return { ...item, quantity: max }
  })
}

function limitFailure(product: ProductCardItem, max: number): CartQuantityResult {
  return {
    ok: false,
    reason: 'limit',
    message: formatMaxQuantityMessage(
      max,
      product.quantityLimitPerCustomer,
      product.quantityAvailable,
    ),
    maxQuantity: max,
  }
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => {
      const setItems = (items: CartItem[]) => {
        const promo = items.length === 0 ? EMPTY_PROMO : {}
        set({ items, ...promo, ...calcTotals({ ...get(), ...promo, items }) })
      }

      return {
        items: [],
        totalItems: 0,
        totalPrice: 0,
        ...EMPTY_PROMO,
        promoNotice: null,
        promoItemsDiscount: 0,
        shippingPrice: 0,
        shippingLoading: false,
        shippingError: null,
        shippingIsFree: false,
        shippingCarrier: null,

        addItem: (product, quantity, size, variantId) => {
          const id = variantId || product.id
          const addBy = Math.max(1, Math.floor(quantity) || 1)
          const items = [...get().items]
          const existingIndex = items.findIndex((item) => item.id === id)
          const currentQty = existingIndex >= 0 ? items[existingIndex].quantity : 0
          const mergedProduct: ProductCardItem =
            existingIndex >= 0
              ? {
                  ...items[existingIndex].product,
                  ...product,
                  quantityLimitPerCustomer:
                    product.quantityLimitPerCustomer ??
                    items[existingIndex].product.quantityLimitPerCustomer,
                  quantityAvailable:
                    product.quantityAvailable ??
                    items[existingIndex].product.quantityAvailable,
                }
              : product
          const max = resolveItemMaxQuantity(mergedProduct)

          if (max != null && currentQty + addBy > max) {
            if (currentQty < max && existingIndex >= 0) {
              items[existingIndex] = {
                ...items[existingIndex],
                quantity: max,
                product: mergedProduct,
              }
              setItems(items)
            } else if (currentQty === 0 && max >= 1) {
              items.push({
                id,
                product: mergedProduct,
                quantity: max,
                size,
                variantId,
              })
              setItems(items)
            }
            return limitFailure(mergedProduct, max)
          }

          if (existingIndex >= 0) {
            items[existingIndex] = {
              ...items[existingIndex],
              quantity: currentQty + addBy,
              product: mergedProduct,
            }
          } else {
            items.push({ id, product, quantity: addBy, size, variantId })
          }

          setItems(items)
          return { ok: true }
        },

        removeItem: (id) => {
          setItems(get().items.filter((item) => item.id !== id))
        },

        replaceItems: (items) => {
          setItems(items)
        },

        increaseQuantity: (id) => {
          const items = [...get().items]
          const index = items.findIndex((item) => item.id === id)
          if (index < 0) return { ok: true }

          const item = items[index]
          const max = resolveItemMaxQuantity(item.product)
          if (max != null && item.quantity >= max) {
            return limitFailure(item.product, max)
          }

          items[index] = { ...item, quantity: item.quantity + 1 }
          setItems(items)
          return { ok: true }
        },

        decreaseQuantity: (id: any) => {
          const items = get()
            .items.map((item) =>
              item.id === id ? { ...item, quantity: item.quantity - 1 } : item,
            )
            .filter((i) => i.quantity > 0)
          setItems(items)
        },

        setShippingPrice: (price) => {
          set({
            shippingPrice: price,
            shippingLoading: false,
            shippingError: price > 0 ? null : get().shippingError,
            shippingIsFree: price === 0 ? get().shippingIsFree : false,
            ...calcTotals({ ...get(), shippingPrice: price }),
          })
        },

        setShippingLoading: (loading) => set({ shippingLoading: loading }),

        setShippingError: (message) =>
          set({ shippingError: message, shippingIsFree: message ? false : get().shippingIsFree }),

        setShippingIsFree: (isFree) => set({ shippingIsFree: isFree }),

        setShippingCarrier: (carrier) => set({ shippingCarrier: carrier }),

        applyPromoCode: (result, cartSig) => {
          const promo = {
            appliedPromoCode: result.code,
            discount:
              result.discountValueType === 'PERCENTAGE' ? result.discountValue : 0,
            discountAmount: result.discountAmount,
            discountType: result.discountType,
            discountValueType: result.discountValueType,
            discountValue: result.discountValue,
            promoScope: result.scope,
            promoCartSignature: cartSig ?? cartSignature(get().items),
            promoValidatedAt: Date.now(),
          }
          set({ ...promo, promoNotice: null, ...calcTotals({ ...get(), ...promo }) })
        },

        removePromoCode: (notice = null) => {
          set({
            ...EMPTY_PROMO,
            promoNotice: notice,
            ...calcTotals({ ...get(), ...EMPTY_PROMO }),
          })
        },

        setPromoNotice: (notice) => set({ promoNotice: notice }),

        clearCart: () =>
          set({
            items: [],
            totalItems: 0,
            totalPrice: 0,
            ...EMPTY_PROMO,
            promoNotice: null,
            promoItemsDiscount: 0,
            shippingPrice: 0,
            shippingError: null,
            shippingIsFree: false,
            shippingCarrier: null,
          }),
      }
    },
    {
      name: 'cart-storage',
      partialize: (state) => ({
        items: state.items,
        totalItems: state.totalItems,
        totalPrice: state.totalPrice,
        discount: state.discount,
        discountAmount: state.discountAmount,
        discountType: state.discountType,
        discountValueType: state.discountValueType,
        discountValue: state.discountValue,
        promoScope: state.promoScope,
        promoCartSignature: state.promoCartSignature,
        promoValidatedAt: state.promoValidatedAt,
        promoItemsDiscount: state.promoItemsDiscount,
        shippingPrice: state.shippingPrice,
        shippingCarrier: state.shippingCarrier,
        shippingIsFree: state.shippingIsFree,
        appliedPromoCode: state.appliedPromoCode,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return
        const items = state.items?.length ? clampCartItems(state.items) : []
        useCartStore.setState({ items, ...calcTotals({ ...state, items }) })
      },
    },
  ),
)

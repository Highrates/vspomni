import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { CartItem } from '@/types/cart'
import { ProductCardItem } from '@/types/product'
import {
  formatQuantityLimitMessage,
  normalizeQuantityLimit,
} from '@/lib/product/quantityLimit'

export type CartQuantityResult =
  | { ok: true }
  | { ok: false; reason: 'limit'; message: string; maxQuantity: number }

interface CartState {
  items: CartItem[]
  totalItems: number
  totalPrice: number
  discount: number              // Скидка в процентах (для процентных ваучеров)
  discountAmount?: number       // Фиксированная сумма скидки (для FIXED ваучеров)
  discountType?: 'PERCENTAGE' | 'FIXED'
  shippingPrice: number
  shippingLoading: boolean
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
  increaseQuantity: (id: string) => CartQuantityResult
  decreaseQuantity: (id: string) => void
  clearCart: () => void
  setShippingPrice: (price: number) => void
  setShippingLoading: (loading: boolean) => void
  setShippingCarrier: (carrier: 'cdek' | 'yandex' | 'ozon' | null) => void
  applyPromoCode: (
    code: string,
    discountPercent: number,
    discountAmount?: number,
    discountType?: 'PERCENTAGE' | 'FIXED',
  ) => void
  removePromoCode: () => void
}

const calcTotals = (items: CartItem[], discount: number = 0, discountAmount?: number, shippingPrice: number = 0) => {
  // защитимся от старых/битых записей в localStorage,
  // где product мог быть undefined или без price
  const validItems = items.filter((i) => i.product && typeof i.product.price === 'number')

  const subtotal = validItems.reduce(
    (sum, i) => sum + i.product.price * i.quantity,
    0,
  )

  // Если передан discountAmount (фиксированная скидка), используем его
  // Иначе вычисляем процентную скидку
  const finalDiscountAmount = discountAmount !== undefined
    ? discountAmount
    : (discount > 0 ? (subtotal * discount) / 100 : 0)

  return {
    totalItems: validItems.reduce((sum, i) => sum + i.quantity, 0),
    totalPrice: subtotal - finalDiscountAmount + shippingPrice,
  }
}

function clampCartItems(items: CartItem[]): CartItem[] {
  return items.map((item) => {
    const max = normalizeQuantityLimit(item.product?.quantityLimitPerCustomer)
    if (max == null || item.quantity <= max) return item
    return { ...item, quantity: max }
  })
}

function limitFailure(max: number): CartQuantityResult {
  return {
    ok: false,
    reason: 'limit',
    message: formatQuantityLimitMessage(max),
    maxQuantity: max,
  }
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      totalItems: 0,
      totalPrice: 0,
      discount: 0,
      discountAmount: undefined,
      discountType: undefined,
      shippingPrice: 0,
      shippingLoading: false,
      shippingCarrier: null,
      appliedPromoCode: null,

      addItem: (product, quantity, size, variantId) => {
        const id = variantId || product.id
        const addBy = Math.max(1, Math.floor(quantity) || 1)
        const items = [...get().items]
        const existingIndex = items.findIndex((item) => item.id === id)
        const currentQty = existingIndex >= 0 ? items[existingIndex].quantity : 0
        const max = normalizeQuantityLimit(
          product.quantityLimitPerCustomer ??
            (existingIndex >= 0
              ? items[existingIndex].product?.quantityLimitPerCustomer
              : undefined),
        )

        if (max != null && currentQty + addBy > max) {
          if (currentQty < max && existingIndex >= 0) {
            items[existingIndex] = {
              ...items[existingIndex],
              quantity: max,
              product: {
                ...items[existingIndex].product,
                ...product,
                quantityLimitPerCustomer: max,
              },
            }
            const { discount, discountAmount, shippingPrice } = get()
            set({ items, ...calcTotals(items, discount, discountAmount, shippingPrice) })
          } else if (currentQty === 0 && max >= 1) {
            // first add but requested more than limit — add up to max
            items.push({
              id,
              product: { ...product, quantityLimitPerCustomer: max },
              quantity: max,
              size,
              variantId,
            })
            const { discount, discountAmount, shippingPrice } = get()
            set({ items, ...calcTotals(items, discount, discountAmount, shippingPrice) })
          }
          return limitFailure(max)
        }

        if (existingIndex >= 0) {
          items[existingIndex] = {
            ...items[existingIndex],
            quantity: currentQty + addBy,
            product: {
              ...items[existingIndex].product,
              ...product,
              quantityLimitPerCustomer:
                product.quantityLimitPerCustomer ??
                items[existingIndex].product.quantityLimitPerCustomer,
            },
          }
        } else {
          items.push({ id, product, quantity: addBy, size, variantId })
        }

        const { discount, discountAmount, shippingPrice } = get()
        const totals = calcTotals(items, discount, discountAmount, shippingPrice)
        set({ items, ...totals })
        return { ok: true }
      },

      removeItem: (id) => {
        const items = get().items.filter((item) => item.id !== id)
        const { discount, discountAmount, shippingPrice } = get()
        const totals = calcTotals(items, discount, discountAmount, shippingPrice)
        set({ items, ...totals })
      },

      increaseQuantity: (id) => {
        const items = [...get().items]
        const index = items.findIndex((item) => item.id === id)
        if (index < 0) return { ok: true }

        const item = items[index]
        const max = normalizeQuantityLimit(item.product?.quantityLimitPerCustomer)
        if (max != null && item.quantity >= max) {
          return limitFailure(max)
        }

        items[index] = { ...item, quantity: item.quantity + 1 }
        const { discount, discountAmount, shippingPrice } = get()
        const totals = calcTotals(items, discount, discountAmount, shippingPrice)
        set({ items, ...totals })
        return { ok: true }
      },

      decreaseQuantity: (id: any) => {
        let items = get().items.map((item) =>
          item.id === id ? { ...item, quantity: item.quantity - 1 } : item,
        )
        items = items.filter((i) => i.quantity > 0)
        const { discount, discountAmount, shippingPrice } = get()
        const totals = calcTotals(items, discount, discountAmount, shippingPrice)
        set({ items, ...totals })
      },

      setShippingPrice: (price) => {
        const { items, discount, discountAmount } = get()
        const totals = calcTotals(items, discount, discountAmount, price)
        set({ shippingPrice: price, shippingLoading: false, ...totals })
      },

      setShippingLoading: (loading) => set({ shippingLoading: loading }),

      setShippingCarrier: (carrier) => set({ shippingCarrier: carrier }),

      applyPromoCode: (code, discountPercent, discountAmount, discountType) => {
        const { items, shippingPrice } = get()
        const totals = calcTotals(items, discountPercent, discountAmount, shippingPrice)
        set({
          appliedPromoCode: code,
          discount: discountPercent,
          discountAmount: discountAmount,
          discountType,
          ...totals
        })
      },

      removePromoCode: () => {
        const { items, shippingPrice } = get()
        const totals = calcTotals(items, 0, undefined, shippingPrice)
        set({
          appliedPromoCode: null,
          discount: 0,
          discountAmount: undefined,
          discountType: undefined,
          ...totals
        })
      },

      clearCart: () => set({
        items: [],
        totalItems: 0,
        totalPrice: 0,
        discount: 0,
        discountAmount: undefined,
        discountType: undefined,
        shippingPrice: 0,
        shippingCarrier: null,
        appliedPromoCode: null,
      }),
    }),
    {
      name: 'cart-storage',
      onRehydrateStorage: () => (state) => {
        if (!state?.items?.length) return
        const clamped = clampCartItems(state.items)
        if (clamped.some((item, i) => item.quantity !== state.items[i]?.quantity)) {
          const { discount, discountAmount, shippingPrice } = state
          const totals = calcTotals(clamped, discount, discountAmount, shippingPrice)
          useCartStore.setState({ items: clamped, ...totals })
        }
      },
    },
  ),
)

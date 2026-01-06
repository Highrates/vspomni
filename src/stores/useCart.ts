import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { CartItem } from '@/types/cart'
import { ProductCardItem } from '@/types/product'

interface CartState {
  items: CartItem[]
  totalItems: number
  totalPrice: number
  discount: number              // Скидка в процентах (для процентных ваучеров)
  discountAmount?: number       // Фиксированная сумма скидки (для FIXED ваучеров)
  discountType?: 'PERCENTAGE' | 'FIXED'
  appliedPromoCode: string | null

  addItem: (product: ProductCardItem, quantity: number, size: string, variantId?: string) => void
  removeItem: (id: string) => void
  increaseQuantity: (id: string) => void
  decreaseQuantity: (id: string) => void
  clearCart: () => void
  applyPromoCode: (
    code: string,
    discountPercent: number,
    discountAmount?: number,
    discountType?: 'PERCENTAGE' | 'FIXED',
  ) => void
  removePromoCode: () => void
}

const calcTotals = (items: CartItem[], discount: number = 0, discountAmount?: number) => {
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
    totalPrice: subtotal - finalDiscountAmount,
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
      appliedPromoCode: null,

      addItem: (product, quantity, size, variantId) => {
        // Используем variantId как ID для уникальности товара с конкретным вариантом
        const id = variantId || product.id
        const items = [...get().items]
        const existingIndex = items.findIndex((item) => item.id === id)

        if (existingIndex >= 0) {
          items[existingIndex].quantity += quantity
        } else {
          items.push({ id, product, quantity, size, variantId })
        }

        const { discount, discountAmount } = get()
        const totals = calcTotals(items, discount, discountAmount)
        set({ items, ...totals })
      },

      removeItem: (id) => {
        const items = get().items.filter((item) => item.id !== id)
        const { discount, discountAmount } = get()
        const totals = calcTotals(items, discount, discountAmount)
        set({ items, ...totals })
      },

      increaseQuantity: (id) => {
        const items = get().items.map((item) =>
          item.id === id ? { ...item, quantity: item.quantity + 1 } : item,
        )
        const { discount, discountAmount } = get()
        const totals = calcTotals(items, discount, discountAmount)
        set({ items, ...totals })
      },

      decreaseQuantity: (id: any) => {
        let items = get().items.map((item) =>
          item.id === id ? { ...item, quantity: item.quantity - 1 } : item,
        )
        items = items.filter((i) => i.quantity > 0)
        const { discount, discountAmount } = get()
        const totals = calcTotals(items, discount, discountAmount)
        set({ items, ...totals })
      },

      applyPromoCode: (code, discountPercent, discountAmount, discountType) => {
        const { items } = get()
        const totals = calcTotals(items, discountPercent, discountAmount)
        set({ 
          appliedPromoCode: code, 
          discount: discountPercent,
          discountAmount: discountAmount,
          discountType,
          ...totals 
        })
      },

      removePromoCode: () => {
        const { items } = get()
        const totals = calcTotals(items, 0)
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
        appliedPromoCode: null,
      }),
    }),
    { name: 'cart-storage' },
  ),
)



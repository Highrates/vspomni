import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { productsGridItem } from '@/lib/mock/products'
import { CartItem } from '@/types/cart'



interface CartState {
  items: CartItem[]
  totalItems: number
  totalPrice: number

  addItem: (product: productsGridItem, quantity: number, size: string) => void
  removeItem: (id: string) => void
  increaseQuantity: (id: string) => void
  decreaseQuantity: (id: string) => void
  clearCart: () => void
}

const calcTotals = (items: CartItem[]) => ({
  totalItems: items.reduce((sum, i) => sum + i.quantity, 0),
  totalPrice: items.reduce((sum, i) => sum + i.product.price * i.quantity, 0),
})

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      totalItems: 0,
      totalPrice: 0,

      addItem: (product, quantity, size) => {
        const id = `${product.id}_${size}`
        const items = [...get().items]
        const existingIndex = items.findIndex((item) => item.id === id)

        if (existingIndex >= 0) {
          items[existingIndex].quantity += quantity
        } else {
          items.push({ id, product, quantity, size })
        }

        const totals = calcTotals(items)
        set({ items, ...totals })
      },

      removeItem: (id) => {
        const items = get().items.filter((item) => item.id !== id)
        const totals = calcTotals(items)
        set({ items, ...totals })
      },

      increaseQuantity: (id) => {
        const items = get().items.map((item) =>
          item.id === id ? { ...item, quantity: item.quantity + 1 } : item,
        )
        const totals = calcTotals(items)
        set({ items, ...totals })
      },

      decreaseQuantity: (id: any) => {
        let items = get().items.map((item) =>
          item.id === id ? { ...item, quantity: item.quantity - 1 } : item,
        )
        items = items.filter((i) => i.quantity > 0)
        const totals = calcTotals(items)
        set({ items, ...totals })
      },

      clearCart: () => set({ items: [], totalItems: 0, totalPrice: 0 }),
    }),
    { name: 'cart-storage' },
  ),
)



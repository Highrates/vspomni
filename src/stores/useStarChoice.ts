import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { StarChoiceItem } from '@/types/product'
import { getChoiceProducts } from '@/graphql/queries/product.service'
 
interface StarChoiceState {
  products: StarChoiceItem[]
  setProducts: (items: StarChoiceItem[]) => void
  fetchProducts: () => void
}

const storage =
  typeof window !== 'undefined'
    ? createJSONStorage<StarChoiceState>(() => localStorage)
    : undefined

export const useStarChoiceStore = create<StarChoiceState>()(
  persist(
    (set) => ({
      products: [],
      setProducts: (items) => {
        set({
          products: items
        })
      },
      fetchProducts: async () => {
        try {
          const result = await getChoiceProducts()
          set({ products: result })
        } catch (error) {
          console.error('Failed to fetch star choice products', error)
        }
      }
    }),
    {
      name: 'star-choice-storage',
      storage,
    },
  ),
)

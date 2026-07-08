import { create } from 'zustand'
import { StarChoiceItem } from '@/types/product'
import { getChoiceProducts } from '@/graphql/queries/product.service'

interface StarChoiceState {
  products: StarChoiceItem[]
  setProducts: (items: StarChoiceItem[]) => void
  fetchProducts: () => Promise<void>
}

export const useStarChoiceStore = create<StarChoiceState>()((set) => ({
  products: [],
  setProducts: (items) => {
    set({ products: items })
  },
  fetchProducts: async () => {
    try {
      const result = await getChoiceProducts()
      set({ products: result })
    } catch (error) {
      console.error('Failed to fetch star choice products', error)
    }
  },
}))

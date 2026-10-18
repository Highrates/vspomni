import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { ProductCardItem } from '@/types/product'
import { getGreedProducts } from '@/graphql/queries/product.service'


interface ProductGridState {
  greed: ProductCardItem[]
  setGrid: (items: ProductCardItem[]) => void
  fetchGridGraphQL: () => void
}

export const useProductGridStore = create<ProductGridState>()(
  persist(
    (set) => ({
      greed: [],
      setGrid: (items) => {
        set({
          greed: items,
        })
      },
      fetchGridGraphQL: async () => {
        const result = await getGreedProducts()
        
        set({ greed: result })
      },
    }),
    {
      name: 'product-grid-storage',
    },
  ),
)

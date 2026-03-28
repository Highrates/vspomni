import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { StarChoiceItem } from '@/types/product'
import { getChoiceProducts } from '@/graphql/queries/product.service'

interface StarChoiceState {
  products: StarChoiceItem[]
  setProducts: (items: StarChoiceItem[]) => void
  fetchProducts: () => void
}

// Safari (особенно в приватном режиме) может кидать ошибку при доступе к localStorage.
// Без этой проверки zustand persist падает, и блок "Выбор ⭐" не рендерится.
const safeCreateStorage = () => {
  if (typeof window === 'undefined') return undefined

  try {
    const testKey = '__star_choice_storage_test__'
    window.localStorage.setItem(testKey, '1')
    window.localStorage.removeItem(testKey)
    return createJSONStorage<StarChoiceState>(() => localStorage)
  } catch {
    return undefined
  }
}

const storage = safeCreateStorage()

export const useStarChoiceStore = create<StarChoiceState>()(
  persist(
    (set) => ({
      products: [],
      setProducts: (items) => {
        set({
          products: items,
        })
      },
      fetchProducts: async () => {
        try {
          const result = await getChoiceProducts()
          set({ products: result })
        } catch (error) {
          console.error('Failed to fetch star choice products', error)
        }
      },
    }),
    {
      name: 'star-choice-storage',
      storage,
    },
  ),
)

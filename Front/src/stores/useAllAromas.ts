import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { AllAromasItem } from '@/graphql/queries/allAromas.service'
import { getAllAromas } from '@/graphql/queries/allAromas.service'

interface AllAromasState {
  items: AllAromasItem[]
  setItems: (items: AllAromasItem[]) => void
  fetchItems: () => void
}

export const useAllAromasStore = create<AllAromasState>()(
  persist(
    (set) => ({
      items: [],
      setItems: (items) => {
        set({ items })
      },
      fetchItems: async () => {
        const result = await getAllAromas()
        set({ items: result })
      },
    }),
    {
      name: 'all-aromas-storage',
    },
  ),
)

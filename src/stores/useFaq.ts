import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { FaqItem } from '@/types/faq'
import { getAllFaqs } from '@/graphql/queries/faq.service'

interface PopularScentsState {
  faqs: FaqItem[]
  setFaqs: (items: FaqItem[]) => void
  fetchFaqs: () => Promise<void>
}

export const useFaqStore = create<PopularScentsState>()(
  persist(
    (set) => ({
      faqs: [],
      setFaqs: (items) => {
        set({
          faqs: items,
        })
      },
      fetchFaqs: async () => {
        try {
          const result = await getAllFaqs()
          if (result.length > 0) {
            set({ faqs: result })
          }
        } catch (error) {
          console.error('Failed to fetch FAQs:', error)
        }
      },
    }),
    {
      name: 'faq-storage',
    },
  ),
)

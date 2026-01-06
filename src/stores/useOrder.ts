import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { OrderDraftInput, OrderDraftNode } from '@/types/order'
import { createOrderDraftAPI } from '@/graphql/queries/order.service'

interface OrderState {
  id: string | null
  status: string
  createOrderDraft: (input: OrderDraftInput) => Promise<void>
}

export const useOrderStore = create<OrderState>()(
  persist(
    (set) => ({
      id: null,
      status: '',
      createOrderDraft: async (input: OrderDraftInput) => {
        await createOrderDraftAPI(input).then((res: OrderDraftNode | null) => {
          if (res !== null) {
            set({
              id: res.id,
              status: res.status,
            })
          }
        })
      },
    }),
    {
      name: 'order-storage',
    },
  ),
)

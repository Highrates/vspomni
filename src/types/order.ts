import { CheckoutLineInput } from '../graphql/types/cart.types'

export interface OrderDraftInput {
  user: string | null
  userEmail: string
  channelId: string
  lines: CheckoutLineInput[]
}

export interface OrderDraftNode {
  id: string
  userEmail: string
  created: string
  status: string
}

export interface OrderDraftOrderCreateResponse {
  draftOrderCreate: {
    order: OrderDraftNode
    errors: MutationError[]
  }
}

export interface MutationError {
  field: string | null
  message: string
  code: string
}

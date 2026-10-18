import { create } from 'zustand'
import type { AddressInfo } from '@/graphql/types/auth.types'
import {
  clearPersistedCheckoutDeliveryAddress,
  persistCheckoutDeliveryAddress,
} from '@/lib/checkout/deliveryAddress'

interface CheckoutState {
  deliveryAddress: AddressInfo | null
  setDeliveryAddress: (address: AddressInfo | null) => void
  clearCheckout: () => void
}

export const useCheckoutStore = create<CheckoutState>((set) => ({
  deliveryAddress: null,
  setDeliveryAddress: (address) => {
    if (address) {
      persistCheckoutDeliveryAddress(address)
    }
    set({ deliveryAddress: address })
  },
  clearCheckout: () => {
    clearPersistedCheckoutDeliveryAddress()
    set({ deliveryAddress: null })
  },
}))

import { create } from 'zustand'

/** Сигнал для Header: открыть модалку корзины (не персистим). */
interface CartUiState {
  openSignal: number
  openCartModal: () => void
}

export const useCartUiStore = create<CartUiState>((set) => ({
  openSignal: 0,
  openCartModal: () => set((s) => ({ openSignal: s.openSignal + 1 })),
}))

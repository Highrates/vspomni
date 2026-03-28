import { create } from 'zustand'
import { getPickupPoints } from '@/lib/api/yandexDelivery'
import type { YandexPickupPoint } from '@/types/yandexDelivery'

interface YandexPvzState {
  points: YandexPickupPoint[]
  loading: boolean
  error: string | null
  fetchPickupPoints: () => Promise<void>
}

export const useYandexPvzStore = create<YandexPvzState>()((set) => ({
  points: [],
  loading: false,
  error: null,
  fetchPickupPoints: async () => {
    set({ loading: true, error: null })
    try {
      const res = await getPickupPoints()
      set({ points: res.points ?? [], loading: false, error: null })
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Не удалось загрузить ПВЗ'
      set({ error: message, loading: false })
    }
  },
}))

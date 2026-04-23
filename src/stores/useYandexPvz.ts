import { create } from 'zustand'
import { getPickupPoints } from '@/lib/api/yandexDelivery'
import type { YandexPickupPoint } from '@/types/yandexDelivery'
import { resolveYandexGeoId } from '@/lib/yandexCityGeo'

let fetchSeq = 0

interface YandexPvzState {
  points: YandexPickupPoint[]
  /** Кэш по geo_id или "all" при полной выгрузке */
  pointsCache: Record<string, YandexPickupPoint[]>
  loading: boolean
  error: string | null
  /** Загрузка ПВЗ только для города (быстро). Без geo_id — полный список (долго, только fallback). */
  fetchPickupPointsForCity: (cityName: string) => Promise<void>
  clearYandexPvzCache: () => void
}

export const useYandexPvzStore = create<YandexPvzState>()((set, get) => ({
  points: [],
  pointsCache: {},
  loading: false,
  error: null,

  clearYandexPvzCache: () =>
    set({ points: [], pointsCache: {}, error: null, loading: false }),

  fetchPickupPointsForCity: async (cityName: string) => {
    const geoId = resolveYandexGeoId(cityName)
    const cacheKey = geoId != null ? `geo:${geoId}` : 'all'

    const state = get()
    const cached = state.pointsCache[cacheKey]
    if (cached && cached.length > 0) {
      set({ points: cached, loading: false, error: null })
      return
    }

    const seq = ++fetchSeq
    set({ loading: true, error: null })
    try {
      const res =
        geoId != null
          ? await getPickupPoints({ geo_id: geoId })
          : await getPickupPoints()

      if (seq !== fetchSeq) return

      if (geoId == null) {
        console.warn(
          '[Yandex PVZ] Город не найден в справочнике geo_id — загружен полный список ПВЗ (может занять минуту). Добавьте город в lib/yandexCityGeo.ts',
          cityName,
        )
      }

      const pts = res.points ?? []
      set((s) => ({
        points: pts,
        pointsCache: { ...s.pointsCache, [cacheKey]: pts },
        loading: false,
        error: null,
      }))
    } catch (e) {
      if (seq !== fetchSeq) return
      const message = e instanceof Error ? e.message : 'Не удалось загрузить ПВЗ'
      set({ error: message, loading: false })
    }
  },
}))

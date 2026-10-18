'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Search, MapPin, Clock, Phone, ChevronDown, Loader2, Map } from 'lucide-react'
import YandexCdekMap from './YandexCdekMap'

export interface CdekPvzInfo {
  id: string
  cityName: string
  cityCode: string
  address: string
  name: string
  region?: string
  cityArea?: string
  workTime?: string
  phone?: string
  postalCode?: string
  type: 'office' | 'pickup'
}

interface CdekPvzListProps {
  onChoose: (info: CdekPvzInfo) => void
  defaultCity?: string
  initialMode?: 'list' | 'map'
}

interface City {
  code: number
  city: string
  city_uuid: string
  latitude?: number
  longitude?: number
  region?: string
  region_code?: number
  sub_region?: string
}

interface Pvz {
  code: string
  name: string
  address: string
  city: string
  city_code: number
  postal_code?: string
  work_time?: string
  phone?: string
  location?: {
    latitude: number
    longitude: number
    address?: string
    region?: string
    city?: string
    postal_code?: string
  }
}

/** Seed без полного справочника CDEK (код города — официальный location/cities). */
const SEED_CITIES: City[] = [
  { code: 44, city: 'Москва', city_uuid: '', region: 'Москва' },
  { code: 137, city: 'Санкт-Петербург', city_uuid: '', region: 'Санкт-Петербург' },
]

async function fetchCitiesByQuery(city: string, size = 40): Promise<City[]> {
  const baseUrl = window.location.origin
  const params = new URLSearchParams({
    method: 'location/cities',
    country_codes: 'RU',
    city,
    size: String(size),
  })
  const response = await fetch(`${baseUrl}/api/cdek/service?${params}`)
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }
  const data = await response.json()
  const list: City[] = Array.isArray(data) ? data : data.items || []
  return list
}

export default function CdekPvzList({
  onChoose,
  defaultCity = 'Москва',
  initialMode = 'list',
}: CdekPvzListProps) {
  const [cities, setCities] = useState<City[]>(SEED_CITIES)
  const [citiesLoading, setCitiesLoading] = useState(true)
  const [citiesError, setCitiesError] = useState<string | null>(null)
  const [citySearchLoading, setCitySearchLoading] = useState(false)

  const [selectedCity, setSelectedCity] = useState<City | null>(null)
  const [citySearchQuery, setCitySearchQuery] = useState('')
  const [showCityDropdown, setShowCityDropdown] = useState(false)

  const [pvzList, setPvzList] = useState<Pvz[]>([])
  const [pvzLoading, setPvzLoading] = useState(false)
  const [pvzSearchQuery, setPvzSearchQuery] = useState('')
  const [showWidget, setShowWidget] = useState(initialMode === 'map')

  // Синхронизируем режим отображения, если родитель изменит initialMode
  useEffect(() => {
    setShowWidget(initialMode === 'map')
  }, [initialMode])

  // Быстрый старт: seed + точечный запрос defaultCity (не size=10000)
  useEffect(() => {
    let cancelled = false
    const boot = async () => {
      setCitiesLoading(true)
      setCitiesError(null)
      try {
        const hint = defaultCity.trim() || 'Москва'
        const found = await fetchCitiesByQuery(hint, 10)
        if (cancelled) return
        const merged = [...SEED_CITIES]
        for (const c of found) {
          if (!merged.some((m) => m.code === c.code)) merged.push(c)
        }
        setCities(merged)
        const match =
          merged.find((c) => c.city.toLowerCase() === hint.toLowerCase()) ||
          found[0] ||
          merged[0] ||
          null
        setSelectedCity(match)
      } catch (error: any) {
        if (cancelled) return
        setCitiesError(error?.message || 'Ошибка загрузки городов')
        setSelectedCity(SEED_CITIES[0] || null)
      } finally {
        if (!cancelled) setCitiesLoading(false)
      }
    }
    void boot()
    return () => {
      cancelled = true
    }
  }, [defaultCity])

  // Поиск города — debounce + узкий запрос CDEK
  useEffect(() => {
    const q = citySearchQuery.trim()
    if (q.length < 2) return
    let cancelled = false
    const t = window.setTimeout(() => {
      void (async () => {
        setCitySearchLoading(true)
        try {
          const found = await fetchCitiesByQuery(q, 40)
          if (cancelled) return
          setCities((prev) => {
            const merged = [...prev]
            for (const c of found) {
              if (!merged.some((m) => m.code === c.code)) merged.push(c)
            }
            return merged
          })
        } catch {
          /* оставляем seed / предыдущий список */
        } finally {
          if (!cancelled) setCitySearchLoading(false)
        }
      })()
    }, 300)
    return () => {
      cancelled = true
      window.clearTimeout(t)
    }
  }, [citySearchQuery])

  // Загрузка пунктов выдачи при выборе города
  useEffect(() => {
    if (!selectedCity) return

    const fetchPvzList = async () => {
      setPvzLoading(true)
      setPvzList([])

      try {
        const baseUrl = window.location.origin
        const params = new URLSearchParams()

        if (selectedCity.code) params.set('city_code', String(selectedCity.code))
        if (selectedCity.city_uuid) params.set('city_uuid', selectedCity.city_uuid)

        // ВАЖНО: Не передаем координаты здесь, чтобы не ограничивать поиск центром города.
        // Наш API сам решит, как искать (по коду или UUID параллельно).

        params.set('action', 'offices')
        params.set('size', '150')

        const response = await fetch(`${baseUrl}/api/cdek/service?${params.toString()}`, {
          cache: 'no-store'
        })

        if (!response.ok) {
          const errorText = await response.text()
          throw new Error(`HTTP ${response.status}: ${errorText}`)
        }

        const data = await response.json()

        if (data?.error) {
          throw new Error(data.error)
        }

        if (Array.isArray(data)) {
          setPvzList(data)
        }
      } catch (error: any) {
        console.error('Fetch PVZ error:', error)
        setPvzList([])
      } finally {
        setPvzLoading(false)
      }
    }

    fetchPvzList()
  }, [selectedCity])

  // Фильтрация городов по поиску (список уже пополняется API-поиском)
  const filteredCities = useMemo(() => {
    if (!citySearchQuery.trim()) {
      return cities.slice(0, 50)
    }

    const query = citySearchQuery.toLowerCase().trim()
    const matched = cities
      .filter((c) => c.city.toLowerCase().includes(query))
      .slice(0, 50)
    return matched.length > 0 ? matched : cities.slice(0, 20)
  }, [cities, citySearchQuery])

  // Фильтрация пунктов выдачи
  const filteredPvz = useMemo(() => {
    if (!pvzSearchQuery.trim()) return pvzList

    const query = pvzSearchQuery.toLowerCase()
    return pvzList.filter(pvz => {
      const name = (pvz.name || '').toLowerCase()
      const address = (pvz.address || '').toLowerCase()
      return name.includes(query) || address.includes(query)
    })
  }, [pvzList, pvzSearchQuery])

  // Выбор города
  const handleCitySelect = useCallback((city: City) => {
    setSelectedCity(city)
    setCitySearchQuery('')
    setShowCityDropdown(false)
    setPvzSearchQuery('')
    setShowWidget(false) // Сбрасываем режим виджета при смене города
  }, [])

  // Обработчик выбора ПВЗ из карты Яндекс
  const handleMapSelect = useCallback((pvz: Pvz) => {
    const pvzInfo: CdekPvzInfo = {
      id: pvz.code,
      cityName: pvz.city || selectedCity?.city || '',
      cityCode: String(pvz.city_code || selectedCity?.code || ''),
      address: pvz.address || pvz.location?.address || '',
      name: pvz.name || 'ПВЗ СДЭК',
      region: pvz.location?.region || selectedCity?.region || '',
      cityArea: selectedCity?.sub_region || pvz.city || selectedCity?.city || '',
      workTime: pvz.work_time,
      phone: pvz.phone,
      postalCode: pvz.location?.postal_code || pvz.postal_code,
      type: 'office',
    }
    onChoose(pvzInfo)
  }, [selectedCity, onChoose])

  // Выбор пункта выдачи
  const handlePvzSelect = useCallback((pvz: Pvz) => {
    if (!pvz || !pvz.code) return

    const pvzInfo: CdekPvzInfo = {
      id: pvz.code,
      cityName: pvz.city || selectedCity?.city || '',
      cityCode: String(pvz.city_code || selectedCity?.code || ''),
      address: pvz.address || pvz.location?.address || '',
      name: pvz.name || 'ПВЗ СДЭК',
      region: pvz.location?.region || selectedCity?.region || '',
      cityArea: selectedCity?.sub_region || pvz.city || selectedCity?.city || '',
      workTime: pvz.work_time,
      phone: pvz.phone,
      postalCode: pvz.location?.postal_code || pvz.postal_code,
      type: 'office',
    }

    onChoose(pvzInfo)
  }, [selectedCity, onChoose])

  // Закрытие dropdown при клике вне
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('.city-dropdown-container')) {
        setShowCityDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="flex flex-col gap-4">
      {/* Выбор города */}
      <div className="flex flex-col city-dropdown-container relative">
        <label className="text-sm font-medium mb-2 flex items-center gap-2">
          <MapPin className="w-4 h-4" />
          Город
        </label>

        {citiesLoading ? (
          <div className="h-12 px-4 rounded-xl border border-black/10 flex items-center gap-2 text-black/50">
            <Loader2 className="w-4 h-4 animate-spin" />
            Загрузка городов...
          </div>
        ) : citiesError ? (
          <div className="h-12 px-4 rounded-xl border border-red-300 bg-red-50 flex items-center text-red-600 text-sm">
            {citiesError}
          </div>
        ) : (
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowCityDropdown(!showCityDropdown)}
              className="w-full h-12 px-4 rounded-xl border border-black/10 text-base outline-none transition focus:border-black/30 flex items-center justify-between bg-white"
            >
              <span className={selectedCity ? 'text-black' : 'text-black/40'}>
                {selectedCity?.city || 'Выберите город'}
              </span>
              <ChevronDown className={`w-5 h-5 text-black/40 transition-transform ${showCityDropdown ? 'rotate-180' : ''}`} />
            </button>

            {showCityDropdown && (
              <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-black/10 rounded-xl shadow-lg max-h-80 overflow-hidden">
                {/* Поиск города */}
                <div className="p-2 border-b border-black/5">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black/40" />
                    <input
                      type="text"
                      value={citySearchQuery}
                      onChange={(e) => setCitySearchQuery(e.target.value)}
                      placeholder="Поиск города..."
                      className="w-full h-10 pl-9 pr-4 rounded-lg border border-black/10 text-sm outline-none focus:border-black/30"
                      autoFocus
                    />
                    {citySearchLoading ? (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-black/40" />
                    ) : null}
                  </div>
                </div>

                {/* Список городов */}
                <div className="overflow-y-auto max-h-60">
                  {filteredCities.length === 0 ? (
                    <div className="p-4 text-center text-black/50 text-sm">
                      {citySearchLoading ? 'Ищем…' : 'Город не найден'}
                    </div>
                  ) : (
                    filteredCities.map((city) => (
                      <button
                        key={city.code}
                        type="button"
                        onClick={() => handleCitySelect(city)}
                        className={`w-full px-4 py-3 text-left hover:bg-black/5 transition flex items-center justify-between ${selectedCity?.code === city.code ? 'bg-black/5 font-medium' : ''
                          }`}
                      >
                        <span>{city.city}</span>
                        {city.region && (
                          <span className="text-xs text-black/40">{city.region}</span>
                        )}
                      </button>
                    ))
                  )}

                  {filteredCities.length >= 50 && !citySearchQuery && (
                    <div className="px-4 py-2 text-xs text-black/40 text-center border-t border-black/5">
                      Введите название для поиска других городов
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Пункты выдачи */}
      {selectedCity && (
        <>
          {/* Переключатель режимов */}
          <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={() => setShowWidget(false)}
              className={`h-9 sm:h-10 rounded-lg text-xs sm:text-sm font-medium transition flex items-center justify-center gap-1.5 sm:gap-2 ${!showWidget
                ? 'bg-black text-white'
                : 'bg-gray-100 text-black/60 hover:bg-gray-200'
                }`}
            >
              <Search className="w-4 h-4" />
              Список
            </button>
            <button
              type="button"
              onClick={() => setShowWidget(true)}
              className={`h-9 sm:h-10 rounded-lg text-xs sm:text-sm font-medium transition flex items-center justify-center gap-1.5 sm:gap-2 ${showWidget
                ? 'bg-black text-white'
                : 'bg-gray-100 text-black/60 hover:bg-gray-200'
                }`}
            >
              <Map className="w-4 h-4" />
              Карта
            </button>
          </div>

          {showWidget ? (
            // Яндекс Карта с ПВЗ СДЭК
            <YandexCdekMap
              pvzList={pvzList}
              selectedCity={selectedCity}
              onSelect={handleMapSelect}
              loading={pvzLoading}
            />
          ) : (
            <>
              {/* Поиск ПВЗ */}
              <div className="flex flex-col">
                <label className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Search className="w-4 h-4" />
                  Поиск пункта выдачи
                </label>
                <input
                  type="text"
                  value={pvzSearchQuery}
                  onChange={(e) => setPvzSearchQuery(e.target.value)}
                  placeholder="Введите адрес или название ПВЗ"
                  className="h-12 px-4 rounded-xl border border-black/10 text-base outline-none transition focus:border-black/30"
                />
              </div>

              {/* Список ПВЗ */}
              <div className="flex flex-col gap-2 max-h-56 sm:max-h-80 overflow-y-auto overscroll-contain">
                {pvzLoading ? (
                  <div className="flex items-center justify-center gap-2 py-8 text-black/60">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Загрузка пунктов выдачи...</span>
                  </div>
                ) : filteredPvz.length === 0 ? (
                  <div className="text-center py-8 text-black/50 space-y-3">
                    <MapPin className="w-8 h-8 mx-auto text-black/20" />
                    <div className="font-medium">Пункты выдачи не найдены</div>
                    <div className="text-xs text-black/40">
                      {pvzSearchQuery
                        ? 'Попробуйте изменить поисковый запрос'
                        : `Попробуйте открыть карту для поиска ПВЗ в ${selectedCity.city}`}
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowWidget(true)}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition"
                    >
                      <Map className="w-4 h-4" />
                      Открыть карту СДЭК
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="text-xs text-black/40 mb-1">
                      Найдено пунктов: {filteredPvz.length}
                    </div>
                    {filteredPvz.map((pvz) => (
                      <button
                        key={pvz.code}
                        type="button"
                        onClick={() => handlePvzSelect(pvz)}
                        className="text-left p-4 border border-black/10 rounded-xl hover:border-black/30 hover:bg-gray-50/50 transition group"
                      >
                        <div className="font-semibold mb-1 group-hover:text-black/80">
                          {pvz.name || 'ПВЗ СДЭК'}
                        </div>

                        <div className="text-sm text-black/60 mb-2 flex items-start gap-1.5">
                          <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                          {pvz.address || pvz.location?.address || 'Адрес не указан'}
                        </div>

                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-black/50">
                          {pvz.work_time && (
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {pvz.work_time}
                            </div>
                          )}
                          {pvz.phone && (
                            <div className="flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {pvz.phone}
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  </>
                )}
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}

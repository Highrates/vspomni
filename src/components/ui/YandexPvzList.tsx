'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Search, MapPin, Loader2, ChevronDown } from 'lucide-react'
import type { YandexPickupPoint } from '@/types/yandexDelivery'
import YandexPvzMap from './YandexPvzMap'
import { useYandexPvzStore } from '@/stores/useYandexPvz'

const POPULAR_CITIES = ['Москва', 'Санкт-Петербург', 'Новосибирск', 'Екатеринбург', 'Казань']

export interface YandexPvzListProps {
  onChoose: (point: YandexPickupPoint) => void
  defaultCity?: string
}

export default function YandexPvzList({ onChoose, defaultCity = 'Москва' }: YandexPvzListProps) {
  const { points, loading, error, fetchPickupPoints } = useYandexPvzStore()
  const [citySearchQuery, setCitySearchQuery] = useState('')
  const [showCityDropdown, setShowCityDropdown] = useState(false)
  const [pvzSearchQuery, setPvzSearchQuery] = useState('')

  // Если данных ещё нет и запрос не идёт — запустить загрузку (например, модалка открыта с профиля)
  useEffect(() => {
    if (points.length === 0 && !loading && !error) {
      fetchPickupPoints()
    }
  }, [points.length, loading, error, fetchPickupPoints])

  const cities = useMemo(() => {
    const byCity = new Map<string, YandexPickupPoint[]>()
    for (const p of points) {
      const city = p.address?.locality || p.address?.region || 'Другое'
      if (!byCity.has(city)) byCity.set(city, [])
      byCity.get(city)!.push(p)
    }
    const list = Array.from(byCity.keys()).sort((a, b) => a.localeCompare(b, 'ru'))
    const popular = list.filter(c => POPULAR_CITIES.some(p => p === c))
    const rest = list.filter(c => !popular.includes(c))
    return [...popular, ...rest]
  }, [points])

  const selectedCity = defaultCity && cities.includes(defaultCity) ? defaultCity : cities[0] ?? null
  const [pickedCity, setPickedCity] = useState<string | null>(selectedCity)

  useEffect(() => {
    if (selectedCity && !pickedCity) setPickedCity(selectedCity)
  }, [selectedCity, pickedCity])

  const filteredCities = useMemo(() => {
    if (!citySearchQuery.trim()) return cities.slice(0, 50)
    const q = citySearchQuery.toLowerCase().trim()
    return cities.filter(c => c.toLowerCase().includes(q)).slice(0, 50)
  }, [cities, citySearchQuery])

  const pvzInCity = useMemo(() => {
    if (!pickedCity) return []
    return points.filter(
      p => (p.address?.locality || p.address?.region || '') === pickedCity
    )
  }, [points, pickedCity])

  const filteredPvz = useMemo(() => {
    if (!pvzSearchQuery.trim()) return pvzInCity
    const q = pvzSearchQuery.toLowerCase()
    return pvzInCity.filter(
      p =>
        (p.name || '').toLowerCase().includes(q) ||
        (p.address?.full_address || '').toLowerCase().includes(q) ||
        (p.instruction || '').toLowerCase().includes(q)
    )
  }, [pvzInCity, pvzSearchQuery])

  const handleCitySelect = useCallback((city: string) => {
    setPickedCity(city)
    setCitySearchQuery('')
    setShowCityDropdown(false)
    setPvzSearchQuery('')
  }, [])

  const handlePvzSelect = useCallback(
    (pvz: YandexPickupPoint) => {
      onChoose(pvz)
    },
    [onChoose]
  )

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('.yandex-pvz-city-dropdown')) setShowCityDropdown(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-8 text-black/60">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span>Загрузка пунктов выдачи Яндекса...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 rounded-xl border border-amber-200 bg-amber-50 text-amber-800 text-sm">
        {error}
      </div>
    )
  }

  if (!points.length) {
    return (
      <div className="p-4 rounded-xl border border-black/10 text-black/60 text-sm">
        Список ПВЗ пуст. Проверьте настройки доставки Яндекса.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="yandex-pvz-city-dropdown relative flex flex-col">
        <label className="text-sm font-medium mb-2 flex items-center gap-2">
          <MapPin className="w-4 h-4" />
          Город
        </label>
        <button
          type="button"
          onClick={() => setShowCityDropdown(!showCityDropdown)}
          className="w-full h-12 px-4 rounded-xl border border-black/10 text-base outline-none transition focus:border-black/30 flex items-center justify-between bg-white"
        >
          <span className={pickedCity ? 'text-black' : 'text-black/40'}>
            {pickedCity || 'Выберите город'}
          </span>
          <ChevronDown
            className={`w-5 h-5 text-black/40 transition-transform ${showCityDropdown ? 'rotate-180' : ''}`}
          />
        </button>
        {showCityDropdown && (
          <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-black/10 rounded-xl shadow-lg max-h-80 overflow-hidden">
            <div className="p-2 border-b border-black/5">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black/40" />
                <input
                  type="text"
                  value={citySearchQuery}
                  onChange={e => setCitySearchQuery(e.target.value)}
                  placeholder="Поиск города..."
                  className="w-full h-10 pl-9 pr-4 rounded-lg border border-black/10 text-sm outline-none focus:border-black/30"
                  autoFocus
                />
              </div>
            </div>
            <div className="overflow-y-auto max-h-60">
              {filteredCities.length === 0 ? (
                <div className="p-4 text-center text-black/50 text-sm">Город не найден</div>
              ) : (
                filteredCities.map(city => (
                  <button
                    key={city}
                    type="button"
                    onClick={() => handleCitySelect(city)}
                    className={`w-full px-4 py-3 text-left hover:bg-black/5 transition ${
                      pickedCity === city ? 'bg-black/5 font-medium' : ''
                    }`}
                  >
                    {city}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {pickedCity && (
        <>
          <YandexPvzMap
            points={pvzInCity}
            onSelect={onChoose}
          />
          <div className="flex flex-col">
            <label className="text-sm font-medium mb-2 flex items-center gap-2">
              <Search className="w-4 h-4" />
              Поиск пункта выдачи
            </label>
            <input
              type="text"
              value={pvzSearchQuery}
              onChange={e => setPvzSearchQuery(e.target.value)}
              placeholder="Адрес или название ПВЗ"
              className="h-12 px-4 rounded-xl border border-black/10 text-base outline-none transition focus:border-black/30"
            />
          </div>
          <div className="flex flex-col gap-2 max-h-72 overflow-y-auto">
            <div className="text-xs text-black/40">
              Найдено: {filteredPvz.length}
            </div>
            {filteredPvz.length === 0 ? (
              <div className="text-center py-6 text-black/50 text-sm">
                В этом городе пункты не найдены или измените поиск.
              </div>
            ) : (
              filteredPvz.map(pvz => (
                <button
                  key={pvz.id}
                  type="button"
                  onClick={() => handlePvzSelect(pvz)}
                  className="text-left p-4 border border-black/10 rounded-xl hover:border-black/30 hover:bg-gray-50/50 transition group"
                >
                  <div className="font-semibold mb-1 group-hover:text-black/80">
                    {pvz.name || 'ПВЗ Яндекса'}
                  </div>
                  <div className="text-sm text-black/60 flex items-start gap-1.5">
                    <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    {pvz.address?.full_address || [pvz.address?.street, pvz.address?.house].filter(Boolean).join(', ') || '—'}
                  </div>
                  {pvz.instruction && (
                    <div className="text-xs text-black/40 mt-1">{pvz.instruction}</div>
                  )}
                </button>
              ))
            )}
          </div>
        </>
      )}
    </div>
  )
}

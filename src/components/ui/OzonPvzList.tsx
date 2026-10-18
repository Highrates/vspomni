'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Search, MapPin, Loader2, ChevronDown, Check, Clock } from 'lucide-react'
import type { OzonPickupPoint } from '@/types/ozonDelivery'
import { listOzonPickupPoints } from '@/lib/api/ozonDelivery'
import OzonPvzMap from './OzonPvzMap'
import {
  orderedYandexPvzCityNames,
  catalogDisplayCityForUserCity,
} from '@/lib/yandexCityGeo'

export interface OzonPvzListProps {
  onChoose: (point: OzonPickupPoint) => void
  defaultCity?: string
  selectedPointId?: string | null
}

export default function OzonPvzList({
  onChoose,
  defaultCity = 'Москва',
  selectedPointId = null,
}: OzonPvzListProps) {
  // Тот же локальный справочник, что у Яндекса — без сетевого list-cities
  const cities = useMemo(() => orderedYandexPvzCityNames(), [])
  const [pickedCity, setPickedCity] = useState(() =>
    catalogDisplayCityForUserCity(defaultCity),
  )
  const [citySearchQuery, setCitySearchQuery] = useState('')
  const [showCityDropdown, setShowCityDropdown] = useState(false)

  const [points, setPoints] = useState<OzonPickupPoint[]>([])
  const [pointsLoading, setPointsLoading] = useState(false)
  const [pointsError, setPointsError] = useState<string | null>(null)
  const [pvzSearchQuery, setPvzSearchQuery] = useState('')

  useEffect(() => {
    setPickedCity(catalogDisplayCityForUserCity(defaultCity))
  }, [defaultCity])

  useEffect(() => {
    if (!pickedCity) return
    let cancelled = false
    setPointsLoading(true)
    setPointsError(null)
    listOzonPickupPoints(pickedCity)
      .then((list) => {
        if (!cancelled) setPoints(list)
      })
      .catch((e: Error) => {
        if (!cancelled) {
          setPoints([])
          setPointsError(e.message)
        }
      })
      .finally(() => {
        if (!cancelled) setPointsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [pickedCity])

  const filteredCities = useMemo(() => {
    if (!citySearchQuery.trim()) return cities.slice(0, 60)
    const q = citySearchQuery.toLowerCase().trim()
    return cities.filter((c) => c.toLowerCase().includes(q)).slice(0, 60)
  }, [cities, citySearchQuery])

  const filteredPoints = useMemo(() => {
    if (!pvzSearchQuery.trim()) return points
    const q = pvzSearchQuery.toLowerCase()
    return points.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.address.fullAddress || '').toLowerCase().includes(q) ||
        (p.address.address || '').toLowerCase().includes(q),
    )
  }, [points, pvzSearchQuery])

  const handleCitySelect = useCallback((city: string) => {
    setPickedCity(city)
    setCitySearchQuery('')
    setShowCityDropdown(false)
    setPvzSearchQuery('')
  }, [])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('.ozon-pvz-city-dropdown')) setShowCityDropdown(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="space-y-4">
      <div className="relative ozon-pvz-city-dropdown">
        <label className="text-sm font-medium mb-2 block">Город</label>
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
                  onChange={(e) => setCitySearchQuery(e.target.value)}
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
                filteredCities.map((city) => (
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

      {pointsError && (
        <div className="p-4 rounded-xl border border-amber-200 bg-amber-50 text-amber-800 text-sm">
          {pointsError}
        </div>
      )}

      {pointsLoading && points.length === 0 ? (
        <div className="flex items-center justify-center gap-2 py-8 text-black/60">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Загрузка ПВЗ Ozon...</span>
        </div>
      ) : (
        <>
          {pointsLoading && points.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-black/50">
              <Loader2 className="w-4 h-4 animate-spin shrink-0" />
              Обновление списка для выбранного города…
            </div>
          )}
          {points.length > 0 && (
            <OzonPvzMap
              points={filteredPoints}
              onSelect={onChoose}
              selectedPointId={selectedPointId}
            />
          )}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black/40" />
            <input
              type="text"
              value={pvzSearchQuery}
              onChange={(e) => setPvzSearchQuery(e.target.value)}
              placeholder="Поиск ПВЗ по адресу или названию"
              className="w-full h-11 pl-9 pr-4 rounded-xl border border-black/10 text-sm outline-none focus:border-black/30"
            />
          </div>
          <div className="text-xs text-black/40">Найдено: {filteredPoints.length}</div>
          <ul className="space-y-2 max-h-64 overflow-y-auto">
            {filteredPoints.map((p) => {
              const selected = selectedPointId === String(p.id)
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => onChoose(p)}
                    className={`w-full text-left p-3 rounded-xl border transition ${
                      selected
                        ? 'border-green-600 bg-green-50'
                        : 'border-black/10 hover:border-black/25'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-medium text-sm">{p.name}</span>
                      {selected ? (
                        <Check className="w-4 h-4 text-green-700 shrink-0" />
                      ) : null}
                    </div>
                    <div className="text-xs text-black/50 mt-1 flex gap-1">
                      <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      {p.address.fullAddress || p.address.address || '—'}
                    </div>
                    {p.workingHours ? (
                      <div className="text-xs text-black/40 mt-1 flex gap-1">
                        <Clock className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        {p.workingHours}
                      </div>
                    ) : null}
                  </button>
                </li>
              )
            })}
          </ul>
          {!pointsLoading && filteredPoints.length === 0 && !pointsError ? (
            <div className="text-center py-6 text-black/50 text-sm">
              В этом городе пункты не найдены или измените поиск.
            </div>
          ) : null}
        </>
      )}
    </div>
  )
}

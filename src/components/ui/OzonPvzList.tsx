'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Search, MapPin, Loader2, ChevronDown, Check, Clock } from 'lucide-react'
import type { OzonPickupPoint } from '@/types/ozonDelivery'
import { listOzonCities, listOzonPickupPoints } from '@/lib/api/ozonDelivery'
import OzonPvzMap from './OzonPvzMap'

const PRIORITY_CITIES = ['Москва', 'Санкт-Петербург']

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
  const [cities, setCities] = useState<string[]>([])
  const [citiesLoading, setCitiesLoading] = useState(true)
  const [citiesError, setCitiesError] = useState<string | null>(null)

  const [pickedCity, setPickedCity] = useState(defaultCity)
  const [citySearchQuery, setCitySearchQuery] = useState('')
  const [showCityDropdown, setShowCityDropdown] = useState(false)

  const [points, setPoints] = useState<OzonPickupPoint[]>([])
  const [pointsLoading, setPointsLoading] = useState(false)
  const [pointsError, setPointsError] = useState<string | null>(null)
  const [pvzSearchQuery, setPvzSearchQuery] = useState('')

  useEffect(() => {
    let cancelled = false
    setCitiesLoading(true)
    setCitiesError(null)
    listOzonCities()
      .then((list) => {
        if (cancelled) return
        const sorted = [...list].sort((a, b) => {
          const ai = PRIORITY_CITIES.indexOf(a)
          const bi = PRIORITY_CITIES.indexOf(b)
          if (ai !== -1 || bi !== -1) {
            if (ai === -1) return 1
            if (bi === -1) return -1
            return ai - bi
          }
          return a.localeCompare(b, 'ru')
        })
        setCities(sorted)
        if (sorted.length && !sorted.includes(pickedCity)) {
          const match = sorted.find((c) =>
            c.toLowerCase().includes(defaultCity.toLowerCase()),
          )
          if (match) setPickedCity(match)
        }
      })
      .catch((e: Error) => {
        if (!cancelled) setCitiesError(e.message)
      })
      .finally(() => {
        if (!cancelled) setCitiesLoading(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

  if (citiesLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-8 text-black/60">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span>Загрузка городов Ozon...</span>
      </div>
    )
  }

  if (citiesError) {
    return (
      <div className="p-4 rounded-xl border border-amber-200 bg-amber-50 text-amber-800 text-sm">
        {citiesError}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="relative ozon-pvz-city-dropdown">
        <label className="text-sm font-medium mb-2 block">Город</label>
        <button
          type="button"
          onClick={() => setShowCityDropdown((v) => !v)}
          className="w-full h-11 px-4 rounded-xl border border-black/10 flex items-center justify-between text-left hover:border-black/20"
        >
          <span>{pickedCity || 'Выберите город'}</span>
          <ChevronDown className="w-4 h-4 text-black/40" />
        </button>
        {showCityDropdown && (
          <div className="absolute z-20 mt-1 w-full bg-white border border-black/10 rounded-xl shadow-lg max-h-64 overflow-hidden">
            <div className="p-2 border-b border-black/5">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black/30" />
                <input
                  type="text"
                  value={citySearchQuery}
                  onChange={(e) => setCitySearchQuery(e.target.value)}
                  placeholder="Поиск города..."
                  className="w-full h-9 pl-9 pr-3 rounded-lg border border-black/10 text-sm outline-none"
                />
              </div>
            </div>
            <ul className="max-h-48 overflow-y-auto py-1">
              {filteredCities.map((city) => (
                <li key={city}>
                  <button
                    type="button"
                    onClick={() => handleCitySelect(city)}
                    className={`w-full px-4 py-2 text-left text-sm hover:bg-black/5 flex items-center justify-between ${
                      pickedCity === city ? 'font-semibold' : ''
                    }`}
                  >
                    {city}
                    {pickedCity === city ? (
                      <Check className="w-4 h-4 text-[#005BFF]" />
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {pickedCity && points.length > 0 && !pointsLoading && (
        <OzonPvzMap
          points={filteredPoints.length > 0 ? filteredPoints : points}
          onSelect={onChoose}
          selectedPointId={selectedPointId}
        />
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black/30" />
        <input
          type="text"
          value={pvzSearchQuery}
          onChange={(e) => setPvzSearchQuery(e.target.value)}
          placeholder="Поиск пункта выдачи Ozon..."
          className="w-full h-10 pl-9 pr-3 rounded-xl border border-black/10 text-sm outline-none"
        />
      </div>

      {pointsLoading ? (
        <div className="flex items-center justify-center gap-2 py-6 text-black/60">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Загрузка ПВЗ Ozon...</span>
        </div>
      ) : pointsError ? (
        <div className="p-3 rounded-xl border border-amber-200 bg-amber-50 text-amber-800 text-sm">
          {pointsError}
        </div>
      ) : filteredPoints.length === 0 ? (
        <div className="p-3 rounded-xl border border-black/10 text-black/60 text-sm">
          В этом городе нет пунктов выдачи Ozon.
        </div>
      ) : (
        <ul className="space-y-2 max-h-[320px] overflow-y-auto">
          {filteredPoints.map((pvz) => {
            const selected = selectedPointId === pvz.id
            return (
              <li key={pvz.id}>
                <button
                  type="button"
                  onClick={() => onChoose(pvz)}
                  className={`w-full text-left p-3 rounded-xl border transition ${
                    selected
                      ? 'border-[#005BFF] bg-[#005BFF]/5'
                      : 'border-black/10 hover:border-black/20 hover:bg-black/[0.02]'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-[#005BFF]" />
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-sm">{pvz.name}</div>
                      <div className="text-xs text-black/50 mt-0.5 break-words">
                        {pvz.address.fullAddress ||
                          [pvz.address.city, pvz.address.address]
                            .filter(Boolean)
                            .join(', ')}
                      </div>
                      {pvz.workingHours ? (
                        <div className="flex items-center gap-1 text-xs text-black/40 mt-1">
                          <Clock className="w-3 h-3" />
                          <span>{pvz.workingHours}</span>
                        </div>
                      ) : null}
                    </div>
                    {selected ? (
                      <Check className="w-4 h-4 text-[#005BFF] shrink-0" />
                    ) : null}
                  </div>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

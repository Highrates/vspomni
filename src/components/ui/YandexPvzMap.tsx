'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Loader2, MapPin } from 'lucide-react'
import type { YandexPickupPoint } from '@/types/yandexDelivery'

declare global {
  interface Window {
    ymaps: any
    selectYandexPvz?: (id: string) => void
  }
}

const YANDEX_MAP_API_KEY = process.env.NEXT_PUBLIC_YANDEX_MAP_API_KEY || ''

export interface YandexPvzMapProps {
  points: YandexPickupPoint[]
  onSelect: (point: YandexPickupPoint) => void
  /** Центр карты [широта, долгота]; если не задан — по точкам или Москва */
  center?: [number, number]
}

export default function YandexPvzMap({
  points,
  onSelect,
  center,
}: YandexPvzMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  const clustererRef = useRef<any>(null)
  const [scriptShouldLoad, setScriptShouldLoad] = useState(false)
  const [mapLoading, setMapLoading] = useState(true)
  const [mapReady, setMapReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedPvz, setSelectedPvz] = useState<YandexPickupPoint | null>(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) setScriptShouldLoad(true)
      },
      { rootMargin: '80px', threshold: 0 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    if (!scriptShouldLoad) return
    if (!YANDEX_MAP_API_KEY) {
      setError('Не указан API ключ Яндекс Карт')
      setMapLoading(false)
      return
    }
    if (window.ymaps) {
      setMapLoading(false)
      return
    }
    const script = document.getElementById('yandex-maps-api-script') as HTMLScriptElement | null
    const el = script || document.createElement('script')
    if (!script) {
      el.id = 'yandex-maps-api-script'
      ;(el as HTMLScriptElement).src = `https://api-maps.yandex.ru/2.1/?apikey=${YANDEX_MAP_API_KEY}&lang=ru_RU`
      el.async = true
      document.head.appendChild(el)
    }
    const onLoad = () => {
      window.ymaps.ready(() => setMapLoading(false))
    }
    el.addEventListener('load', onLoad)
    if (window.ymaps) setMapLoading(false)
    return () => el.removeEventListener('load', onLoad)
  }, [scriptShouldLoad])

  useEffect(() => {
    if (mapLoading || !window.ymaps || !containerRef.current) return
    setMapReady(false)
    if (mapRef.current) {
      mapRef.current.destroy()
      mapRef.current = null
    }
    const defaultCenter: [number, number] = center || [55.751574, 37.573856]
    mapRef.current = new window.ymaps.Map(containerRef.current, {
      center: defaultCenter,
      zoom: 11,
      controls: ['zoomControl', 'fullscreenControl'],
    }, { suppressMapOpenBlock: true })
    clustererRef.current = new window.ymaps.Clusterer({
      preset: 'islands#greenClusterIcons',
      groupByCoordinates: false,
    })
    mapRef.current.geoObjects.add(clustererRef.current)
    setMapReady(true)
    return () => {
      if (mapRef.current) {
        mapRef.current.destroy()
        mapRef.current = null
      }
    }
  }, [mapLoading, center])

  useEffect(() => {
    if (!mapReady || !mapRef.current || !clustererRef.current) return
    clustererRef.current.removeAll()
    const withCoords = points.filter(p => p.position?.latitude != null && p.position?.longitude != null)
    if (withCoords.length === 0) return
    const placemarks = withCoords.map(pvz => {
      const lat = pvz.position!.latitude
      const lon = pvz.position!.longitude
      const addr = pvz.address?.full_address || [pvz.address?.street, pvz.address?.house].filter(Boolean).join(', ') || '—'
      return new window.ymaps.Placemark(
        [lat, lon],
        {
          balloonContentHeader: `<strong>${pvz.name || 'ПВЗ'}</strong>`,
          balloonContentBody: `<div style="padding:6px 0;">📍 ${addr}</div>`,
          balloonContentFooter: `<button onclick="window.selectYandexPvz && window.selectYandexPvz('${pvz.id}')" style="background:#16a34a;color:#fff;border:none;padding:8px 16px;border-radius:8px;cursor:pointer;width:100%;font-weight:500;">Выбрать</button>`,
          hintContent: pvz.name || 'ПВЗ',
        },
        { preset: 'islands#greenDotIcon' }
      )
    })
    clustererRef.current.add(placemarks)
    if (withCoords.length === 1 && !center) {
      mapRef.current.setCenter([withCoords[0].position!.latitude, withCoords[0].position!.longitude], 14)
    } else if (withCoords.length > 1 && !center) {
      const bounds = window.ymaps.util.bounds.fromPoints(
        withCoords.map((p: YandexPickupPoint) => [p.position!.latitude, p.position!.longitude])
      )
      mapRef.current.setBounds(bounds, { checkZoomRange: true, zoomMargin: 50 })
    }
  }, [mapReady, points, center])

  useEffect(() => {
    window.selectYandexPvz = (id: string) => {
      const p = points.find(x => x.id === id)
      if (p) setSelectedPvz(p)
    }
    return () => { delete (window as any).selectYandexPvz }
  }, [points])

  const handleSelect = useCallback(() => {
    if (selectedPvz) onSelect(selectedPvz)
  }, [selectedPvz, onSelect])

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-center text-sm text-red-600">
        {error}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div
        ref={containerRef}
        className="h-[320px] w-full overflow-hidden rounded-xl border border-black/10 bg-gray-100"
      >
        {!scriptShouldLoad && (
          <div className="flex h-full items-center justify-center text-black/40 text-sm">
            Карта загрузится при просмотре
          </div>
        )}
        {scriptShouldLoad && mapLoading && (
          <div className="flex h-full flex-col items-center justify-center gap-2 bg-white/80">
            <Loader2 className="h-8 w-8 animate-spin text-green-600" />
            <span className="text-sm text-black/60">Загрузка карты...</span>
          </div>
        )}
        {scriptShouldLoad && !mapLoading && points.filter(p => p.position?.latitude).length === 0 && (
          <div className="flex h-full items-center justify-center text-black/50 text-sm">
            Нет пунктов с координатами для отображения на карте
          </div>
        )}
      </div>
      {selectedPvz && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-3">
          <div className="flex items-start gap-2">
            <MapPin className="h-5 w-5 shrink-0 text-green-600" />
            <div className="min-w-0 flex-1 text-sm">
              <div className="font-semibold text-green-800">{selectedPvz.name}</div>
              <div className="text-green-700">
                {selectedPvz.address?.full_address || [selectedPvz.address?.street, selectedPvz.address?.house].filter(Boolean).join(', ')}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleSelect}
            className="mt-2 w-full rounded-lg bg-green-600 py-2 text-sm font-medium text-white hover:bg-green-700"
          >
            Выбрать этот пункт
          </button>
        </div>
      )}
    </div>
  )
}

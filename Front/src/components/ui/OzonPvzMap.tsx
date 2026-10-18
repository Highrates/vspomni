'use client'

import { useEffect, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'
import type { OzonPickupPoint } from '@/types/ozonDelivery'

const YANDEX_MAP_API_KEY = process.env.NEXT_PUBLIC_YANDEX_MAP_API_KEY || ''

export interface OzonPvzMapProps {
  points: OzonPickupPoint[]
  onSelect: (point: OzonPickupPoint) => void
  center?: [number, number]
  selectedPointId?: string | null
}

export default function OzonPvzMap({
  points,
  onSelect,
  center,
  selectedPointId = null,
}: OzonPvzMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  const clustererRef = useRef<any>(null)
  const onSelectRef = useRef(onSelect)
  const [scriptShouldLoad, setScriptShouldLoad] = useState(false)
  const [mapLoading, setMapLoading] = useState(true)
  const [mapReady, setMapReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  onSelectRef.current = onSelect

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) setScriptShouldLoad(true)
      },
      { rootMargin: '80px', threshold: 0 },
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
    const script = document.getElementById(
      'yandex-maps-api-script',
    ) as HTMLScriptElement | null
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
    mapRef.current = new window.ymaps.Map(
      containerRef.current,
      {
        center: defaultCenter,
        zoom: 11,
        controls: ['zoomControl', 'fullscreenControl'],
      },
      { suppressMapOpenBlock: true },
    )
    clustererRef.current = new window.ymaps.Clusterer({
      preset: 'islands#blueClusterIcons',
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
    const withCoords = points.filter(
      (p) =>
        p.coordinates?.latitude != null && p.coordinates?.longitude != null,
    )
    if (withCoords.length === 0) return

    const placemarks = withCoords.map((pvz) => {
      const lat = pvz.coordinates!.latitude
      const lon = pvz.coordinates!.longitude
      const addr =
        pvz.address.fullAddress ||
        [pvz.address.city, pvz.address.address].filter(Boolean).join(', ') ||
        '—'
      const isSelected = selectedPointId != null && pvz.id === selectedPointId
      const placemark = new window.ymaps.Placemark(
        [lat, lon],
        {
          balloonContentHeader: `<strong>${pvz.name || 'ПВЗ Ozon'}</strong>`,
          balloonContentBody: `<div style="padding:6px 0;">📍 ${addr}</div>`,
          hintContent: pvz.name || 'ПВЗ Ozon',
        },
        {
          preset: isSelected
            ? 'islands#darkBlueDotIcon'
            : 'islands#blueDotIcon',
        },
      )
      placemark.events.add('click', () => {
        onSelectRef.current(pvz)
      })
      return placemark
    })

    clustererRef.current.add(placemarks)

    if (selectedPointId) {
      const selected = withCoords.find((p) => p.id === selectedPointId)
      if (selected?.coordinates) {
        mapRef.current.setCenter(
          [selected.coordinates.latitude, selected.coordinates.longitude],
          15,
          { duration: 300 },
        )
      }
    } else if (withCoords.length === 1 && !center) {
      mapRef.current.setCenter(
        [withCoords[0].coordinates!.latitude, withCoords[0].coordinates!.longitude],
        14,
      )
    } else if (withCoords.length > 1 && !center) {
      const bounds = window.ymaps.util.bounds.fromPoints(
        withCoords.map((p) => [
          p.coordinates!.latitude,
          p.coordinates!.longitude,
        ]),
      )
      mapRef.current.setBounds(bounds, { checkZoomRange: true, zoomMargin: 50 })
    }
  }, [mapReady, points, center, selectedPointId])

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-center text-sm text-red-600">
        {error}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-black/50">
        Нажмите на метку на карте или выберите пункт в списке ниже
      </p>
      <div
        ref={containerRef}
        className="h-[220px] sm:h-[320px] w-full overflow-hidden rounded-xl border border-black/10 bg-gray-100"
      >
        {!scriptShouldLoad && (
          <div className="flex h-full items-center justify-center text-black/40 text-sm">
            Карта загрузится при просмотре
          </div>
        )}
        {scriptShouldLoad && mapLoading && (
          <div className="flex h-full flex-col items-center justify-center gap-2 bg-white/80">
            <Loader2 className="h-8 w-8 animate-spin text-[#005BFF]" />
            <span className="text-sm text-black/60">Загрузка карты...</span>
          </div>
        )}
        {scriptShouldLoad &&
          !mapLoading &&
          points.filter((p) => p.coordinates?.latitude).length === 0 && (
            <div className="flex h-full items-center justify-center text-black/50 text-sm">
              Нет пунктов с координатами для отображения на карте
            </div>
          )}
      </div>
    </div>
  )
}

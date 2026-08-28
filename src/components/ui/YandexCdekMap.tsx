'use client'

import { useEffect, useRef, useState } from 'react'
import { Loader2, MapPin } from 'lucide-react'

// Типы для Яндекс Карт
declare global {
  interface Window {
    ymaps: any
  }
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
  }
}

interface YandexCdekMapProps {
  pvzList: Pvz[]
  selectedCity: {
    city: string
    latitude?: number
    longitude?: number
  } | null
  onSelect: (pvz: Pvz) => void
  loading?: boolean
}

const YANDEX_MAP_API_KEY = process.env.NEXT_PUBLIC_YANDEX_MAP_API_KEY || ''

export default function YandexCdekMap({
  pvzList,
  selectedCity,
  onSelect,
  loading = false,
}: YandexCdekMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  const clustererRef = useRef<any>(null)
  const [scriptShouldLoad, setScriptShouldLoad] = useState(false)
  const [mapLoading, setMapLoading] = useState(true)
  const [mapReady, setMapReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Подгружаем скрипт Яндекса только когда блок с картой попадает в зону видимости — не тормозим первую отрисовку
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) setScriptShouldLoad(true)
      },
      { rootMargin: '100px', threshold: 0 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  // Загрузка API Яндекс Карт (только после scriptShouldLoad)
  useEffect(() => {
    if (!scriptShouldLoad) return

    const loadYandexMaps = async () => {
      if (!YANDEX_MAP_API_KEY) {
        setError('Не указан API ключ Яндекс Карт')
        setMapLoading(false)
        return
      }
      if (window.ymaps) {
        setMapLoading(false)
        return
      }
      try {
        const existingScript = document.getElementById('yandex-maps-api-script')
        const script =
          existingScript instanceof HTMLScriptElement
            ? existingScript
            : document.createElement('script')
        if (!existingScript) {
          script.id = 'yandex-maps-api-script'
          script.src = `https://api-maps.yandex.ru/2.1/?apikey=${YANDEX_MAP_API_KEY}&lang=ru_RU`
          script.async = true
        }
        await new Promise<void>((resolve, reject) => {
          if (window.ymaps) {
            resolve()
            return
          }
          script.onload = () => resolve()
          script.onerror = () =>
            reject(new Error('Не удалось загрузить Яндекс Карты'))
          if (!existingScript) document.head.appendChild(script)
        })
        await new Promise<void>((resolve) => {
          window.ymaps.ready(() => resolve())
        })
        setMapLoading(false)
      } catch (err: any) {
        console.error('Yandex Maps error:', err)
        setError(err.message || 'Ошибка загрузки карты')
        setMapLoading(false)
      }
    }
    loadYandexMaps()
  }, [scriptShouldLoad])

  // Инициализация карты
  useEffect(() => {
    if (mapLoading || !window.ymaps || !containerRef.current) return

    const initMap = () => {
      setMapReady(false)
      
      // Уничтожаем старую карту если есть
      if (mapRef.current) {
        mapRef.current.destroy()
        mapRef.current = null
      }

      // Определяем центр карты
      const center = selectedCity?.latitude && selectedCity?.longitude
        ? [selectedCity.latitude, selectedCity.longitude]
        : [55.751574, 37.573856] // Москва по умолчанию

      // Создаём карту
      mapRef.current = new window.ymaps.Map(containerRef.current, {
        center,
        zoom: 12,
        controls: ['zoomControl', 'fullscreenControl', 'geolocationControl'],
      }, {
        suppressMapOpenBlock: true,
      })

      // Создаём кластеризатор
      clustererRef.current = new window.ymaps.Clusterer({
        preset: 'islands#greenClusterIcons',
        groupByCoordinates: false,
        clusterDisableClickZoom: false,
        clusterHideIconOnBalloonOpen: false,
        geoObjectHideIconOnBalloonOpen: false,
      })

      mapRef.current.geoObjects.add(clustererRef.current)
      
      console.log('[YandexMap] Map initialized successfully')
      setMapReady(true)
    }

    window.ymaps.ready(initMap)

    return () => {
      if (mapRef.current) {
        mapRef.current.destroy()
        mapRef.current = null
      }
    }
  }, [mapLoading, selectedCity])

  // Обновление меток при изменении списка ПВЗ
  useEffect(() => {
    if (!mapReady || !mapRef.current || !clustererRef.current) {
      console.log('[YandexMap] Map not ready yet, skipping markers', { mapReady })
      return
    }

    // Очищаем старые метки
    clustererRef.current.removeAll()

    // Фильтруем ПВЗ с координатами
    const pvzWithCoords = pvzList.filter(
      pvz => pvz.location?.latitude && pvz.location?.longitude
    )

    console.log(`[YandexMap] Total PVZ: ${pvzList.length}, with coords: ${pvzWithCoords.length}`)

    if (pvzWithCoords.length === 0) {
      console.log('[YandexMap] No PVZ with coordinates found')
      return
    }

    // Создаём метки
    const placemarks = pvzWithCoords.map(pvz => {
      const placemark = new window.ymaps.Placemark(
        [pvz.location!.latitude, pvz.location!.longitude],
        {
          balloonContentHeader: `<strong>${pvz.name || 'ПВЗ СДЭК'}</strong>`,
          balloonContentBody: `
            <div style="padding: 8px 0;">
              <div style="color: #666; margin-bottom: 8px;">
                📍 ${pvz.address || pvz.location?.address || 'Адрес не указан'}
              </div>
              ${pvz.work_time ? `<div style="color: #888; font-size: 12px; margin-bottom: 4px;">🕐 ${pvz.work_time}</div>` : ''}
              ${pvz.phone ? `<div style="color: #888; font-size: 12px;">📞 ${pvz.phone}</div>` : ''}
            </div>
          `,
          hintContent: pvz.name || 'ПВЗ СДЭК',
        },
        {
          preset: 'islands#greenDotIcon',
          iconColor: '#16a34a',
        }
      )

      placemark.events.add('click', () => {
        onSelect(pvz)
        if (mapRef.current) {
          mapRef.current.balloon.close()
        }
      })

      return placemark
    })

    clustererRef.current.add(placemarks)

    // Подстраиваем масштаб под все метки
    if (placemarks.length > 0) {
      mapRef.current.setBounds(clustererRef.current.getBounds(), {
        checkZoomRange: true,
        zoomMargin: 50,
      }).catch(() => {
        // Игнорируем ошибки масштабирования
      })
    }
    console.log(`[YandexMap] Added ${placemarks.length} markers to map`)
  }, [pvzList, mapReady, onSelect])

  if (error) {
    return (
      <div className="border border-red-200 bg-red-50 rounded-xl p-4">
        <div className="text-center space-y-2">
          <MapPin className="w-8 h-8 mx-auto text-red-400" />
          <div className="text-sm text-red-600">{error}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-black/50">
        Нажмите на метку на карте или выберите пункт в списке
      </p>
      <div 
        ref={containerRef}
        className="border border-black/10 rounded-xl overflow-hidden bg-gray-100 h-[240px] sm:h-[360px] relative"
      >
        {!scriptShouldLoad && (
          <div className="absolute inset-0 flex items-center justify-center text-black/40 text-sm">
            Карта загрузится при просмотре
          </div>
        )}
        {scriptShouldLoad && (mapLoading || loading) && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-green-600" />
              <span className="text-sm text-black/60">
                {mapLoading ? 'Загрузка Яндекс Карт...' : 'Загрузка пунктов выдачи...'}
              </span>
            </div>
          </div>
        )}

        {scriptShouldLoad && !mapLoading && !loading && pvzList.filter(p => p.location?.latitude).length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center space-y-2 p-4">
              <MapPin className="w-8 h-8 mx-auto text-black/30" />
              <div className="text-sm text-black/60">
                Нет пунктов выдачи с координатами
              </div>
              <div className="text-xs text-black/40">
                Попробуйте выбрать другой город или использовать список
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

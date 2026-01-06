'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
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
  const [mapLoading, setMapLoading] = useState(true)
  const [mapReady, setMapReady] = useState(false) // Карта полностью инициализирована
  const [error, setError] = useState<string | null>(null)
  const [selectedPvz, setSelectedPvz] = useState<Pvz | null>(null)

  // Загрузка API Яндекс Карт
  useEffect(() => {
    const loadYandexMaps = async () => {
      if (!YANDEX_MAP_API_KEY) {
        setError('Не указан API ключ Яндекс Карт')
        setMapLoading(false)
        return
      }

      // Если API уже загружен
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
          if (!existingScript) {
            document.head.appendChild(script)
          }
        })

        // Ждём готовности API
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
  }, [])

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
          balloonContentFooter: `
            <button 
              onclick="window.selectCdekPvz && window.selectCdekPvz('${pvz.code}')"
              style="
                background: #16a34a; 
                color: white; 
                border: none; 
                padding: 8px 16px; 
                border-radius: 8px; 
                cursor: pointer;
                font-weight: 500;
                width: 100%;
              "
            >
              Выбрать этот пункт
            </button>
          `,
          hintContent: pvz.name || 'ПВЗ СДЭК',
        },
        {
          preset: 'islands#greenDotIcon',
          iconColor: '#16a34a',
        }
      )

      // Обработчик клика на метку
      placemark.events.add('click', () => {
        setSelectedPvz(pvz)
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
  }, [pvzList, mapReady])

  // Обработчик выбора ПВЗ из баллуна
  useEffect(() => {
    (window as any).selectCdekPvz = (code: string) => {
      const pvz = pvzList.find(p => p.code === code)
      if (pvz) {
        setSelectedPvz(pvz)
        onSelect(pvz)
        // Закрываем баллун
        if (mapRef.current) {
          mapRef.current.balloon.close()
        }
      }
    }

    return () => {
      delete (window as any).selectCdekPvz
    }
  }, [pvzList, onSelect])

  // Обработчик выбора ПВЗ
  const handleSelect = useCallback(() => {
    if (selectedPvz) {
      onSelect(selectedPvz)
    }
  }, [selectedPvz, onSelect])

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
    <div className="space-y-4">
      {/* Контейнер карты */}
      <div 
        ref={containerRef}
        className="border border-black/10 rounded-xl overflow-hidden bg-gray-100 h-[400px] relative"
      >
        {(mapLoading || loading) && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-green-600" />
              <span className="text-sm text-black/60">
                {mapLoading ? 'Загрузка Яндекс Карт...' : 'Загрузка пунктов выдачи...'}
              </span>
            </div>
          </div>
        )}

        {!mapLoading && !loading && pvzList.filter(p => p.location?.latitude).length === 0 && (
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

      {/* Выбранный ПВЗ */}
      {selectedPvz && (
        <div className="border border-green-200 bg-green-50 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-green-100 rounded-lg shrink-0">
              <MapPin className="w-5 h-5 text-green-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-green-800">
                {selectedPvz.name || 'ПВЗ СДЭК'}
              </div>
              <div className="text-sm text-green-700 mt-1">
                {selectedPvz.address || selectedPvz.location?.address}
              </div>
              {selectedPvz.work_time && (
                <div className="text-xs text-green-600 mt-1">
                  Режим работы: {selectedPvz.work_time}
                </div>
              )}
              {selectedPvz.phone && (
                <div className="text-xs text-green-600 mt-1">
                  Телефон: {selectedPvz.phone}
                </div>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={handleSelect}
            className="w-full mt-3 h-10 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition"
          >
            Выбрать этот пункт
          </button>
        </div>
      )}
    </div>
  )
}

'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Loader2, MapPin, Search } from 'lucide-react'

declare global {
  interface Window {
    ymaps: any
  }
}

const YANDEX_MAP_API_KEY = process.env.NEXT_PUBLIC_YANDEX_MAP_API_KEY || ''

export type CourierMapResult = {
  lat: number
  lon: number
  addressLine: string
  city?: string
  region?: string
  postalCode?: string
}

function parseGeoObject(geoObject: any): CourierMapResult | null {
  if (!geoObject?.geometry) return null
  const coords = geoObject.geometry.getCoordinates()
  if (!Array.isArray(coords) || coords.length < 2) return null
  const lat = Number(coords[0])
  const lon = Number(coords[1])
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null

  const addressLine = String(geoObject.getAddressLine?.() || '').trim()
  let city = ''
  let region = ''
  let postalCode = ''
  try {
    const meta = geoObject.properties?.get?.('metaDataProperty')?.GeocoderMetaData?.Address
    if (meta) {
      postalCode = String(meta.postal_code || '').trim()
      const components = meta.Components || []
      for (const c of components) {
        if (c.kind === 'locality') city = c.name || city
        if (c.kind === 'province' || c.kind === 'area') region = c.name || region
      }
    }
  } catch {
    /* ignore */
  }

  return { lat, lon, addressLine, city, region, postalCode }
}

export interface DeliveryCourierMapProps {
  onSelect: (result: CourierMapResult) => void
  initialCoords?: { lon: number; lat: number } | null
  hintCity?: string
}

export default function DeliveryCourierMap({
  onSelect,
  initialCoords,
  hintCity = 'Москва',
}: DeliveryCourierMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  const placemarkRef = useRef<any>(null)
  const [scriptShouldLoad, setScriptShouldLoad] = useState(false)
  const [mapLoading, setMapLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchBusy, setSearchBusy] = useState(false)
  const [lastResult, setLastResult] = useState<CourierMapResult | null>(null)
  const initialAppliedRef = useRef(false)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) setScriptShouldLoad(true)
      },
      { rootMargin: '100px', threshold: 0 },
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
    const load = async () => {
      if (window.ymaps) {
        await new Promise<void>((r) => window.ymaps.ready(() => r()))
        setMapLoading(false)
        return
      }
      const existing = document.getElementById('yandex-maps-api-script') as HTMLScriptElement | null
      const script = existing || document.createElement('script')
      if (!existing) {
        script.id = 'yandex-maps-api-script'
        script.src = `https://api-maps.yandex.ru/2.1/?apikey=${YANDEX_MAP_API_KEY}&lang=ru_RU`
        script.async = true
        document.head.appendChild(script)
      }
      await new Promise<void>((resolve, reject) => {
        if (window.ymaps) {
          resolve()
          return
        }
        script.onload = () => resolve()
        script.onerror = () => reject(new Error('Не удалось загрузить Яндекс Карты'))
      })
      await new Promise<void>((r) => window.ymaps.ready(() => r()))
      setMapLoading(false)
    }
    load().catch((e) => {
      setError(e?.message || 'Ошибка карты')
      setMapLoading(false)
    })
  }, [scriptShouldLoad])

  const movePlacemark = useCallback(
    (lat: number, lon: number, geoObject: any) => {
      const parsed = parseGeoObject(geoObject)
      if (!parsed) return

      if (!mapRef.current || !window.ymaps) return

      if (placemarkRef.current) {
        mapRef.current.geoObjects.remove(placemarkRef.current)
        placemarkRef.current = null
      }
      placemarkRef.current = new window.ymaps.Placemark(
        [lat, lon],
        {
          balloonContentHeader: 'Адрес доставки',
          balloonContentBody: parsed.addressLine || 'Адрес уточнён',
        },
        { draggable: true, preset: 'islands#blueDotIcon' },
      )
      placemarkRef.current.events.add('dragend', () => {
        const pos = placemarkRef.current.geometry.getCoordinates()
        window.ymaps.geocode(pos).then((res: any) => {
          const first = res.geoObjects.get(0)
          if (!first) return
          const p = parseGeoObject(first)
          if (p) {
            setLastResult(p)
            onSelect(p)
          }
        })
      })
      mapRef.current.geoObjects.add(placemarkRef.current)
      mapRef.current.setCenter([lat, lon], 16)
      setLastResult(parsed)
      onSelect(parsed)
    },
    [onSelect],
  )

  const movePlacemarkRef = useRef(movePlacemark)
  movePlacemarkRef.current = movePlacemark

  useEffect(() => {
    if (mapLoading || !window.ymaps || !containerRef.current) return

    const center: [number, number] =
      initialCoords &&
      Number.isFinite(initialCoords.lat) &&
      Number.isFinite(initialCoords.lon)
        ? [initialCoords.lat, initialCoords.lon]
        : [55.751574, 37.573856]

    mapRef.current = new window.ymaps.Map(containerRef.current, {
      center,
      zoom:
        initialCoords &&
        Number.isFinite(initialCoords.lat) &&
        Number.isFinite(initialCoords.lon)
          ? 16
          : 10,
      controls: ['zoomControl', 'fullscreenControl', 'geolocationControl'],
    }, { suppressMapOpenBlock: true })

    mapRef.current.events.add('click', (e: any) => {
      const coords = e.get('coords')
      window.ymaps.geocode(coords).then((res: any) => {
        const first = res.geoObjects.get(0)
        if (!first) return
        movePlacemarkRef.current(coords[0], coords[1], first)
      })
    })

    if (
      !initialCoords ||
      !Number.isFinite(initialCoords.lat) ||
      !Number.isFinite(initialCoords.lon)
    ) {
      window.ymaps.geocode(`Россия, ${hintCity}`).then((res: any) => {
        const first = res.geoObjects.get(0)
        if (first && mapRef.current) {
          const c = first.geometry.getCoordinates()
          mapRef.current.setCenter(c, 11)
        }
      })
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.destroy()
        mapRef.current = null
      }
      placemarkRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- карта один раз при готовности API; move через ref
  }, [mapLoading, initialCoords?.lat, initialCoords?.lon, hintCity])

  useEffect(() => {
    if (mapLoading || !window.ymaps || !mapRef.current || initialAppliedRef.current) return
    if (
      !initialCoords ||
      !Number.isFinite(initialCoords.lat) ||
      !Number.isFinite(initialCoords.lon)
    ) {
      return
    }
    initialAppliedRef.current = true
    window.ymaps
      .geocode([initialCoords.lat, initialCoords.lon])
      .then((res: any) => {
        const first = res.geoObjects.get(0)
        if (first) {
          movePlacemark(initialCoords.lat, initialCoords.lon, first)
        } else {
          const manual: CourierMapResult = {
            lat: initialCoords.lat,
            lon: initialCoords.lon,
            addressLine: '',
          }
          setLastResult(manual)
          onSelect(manual)
        }
      })
  }, [mapLoading, initialCoords, movePlacemark, onSelect])

  const handleSearch = useCallback(() => {
    const q = searchQuery.trim()
    if (!q || !window.ymaps) return
    setSearchBusy(true)
    const query = q.includes('Россия') ? q : `Россия, ${q}`
    window.ymaps
      .geocode(query)
      .then((res: any) => {
        const first = res.geoObjects.get(0)
        if (!first) {
          setSearchBusy(false)
          return
        }
        const coords = first.geometry.getCoordinates()
        movePlacemark(coords[0], coords[1], first)
        setSearchBusy(false)
      })
      .catch(() => setSearchBusy(false))
  }, [searchQuery, movePlacemark])

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-center text-sm text-red-600">
        {error}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-black/50">
        Введите адрес и нажмите «Найти» или кликните по карте — метку можно перетащить.
      </p>
      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black/40" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Город, улица, дом"
            className="h-11 w-full rounded-xl border border-black/10 pl-9 pr-3 text-sm outline-none focus:border-black/30"
          />
        </div>
        <button
          type="button"
          onClick={handleSearch}
          disabled={searchBusy || !searchQuery.trim()}
          className="h-11 shrink-0 rounded-xl bg-black px-4 text-sm font-medium text-white disabled:opacity-50"
        >
          {searchBusy ? '…' : 'Найти'}
        </button>
      </div>

      <div
        ref={containerRef}
        className="relative h-[320px] w-full overflow-hidden rounded-xl border border-black/10 bg-gray-100"
      >
        {!scriptShouldLoad && (
          <div className="flex h-full items-center justify-center text-black/40 text-sm">
            Карта загрузится при просмотре
          </div>
        )}
        {scriptShouldLoad && mapLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white/80">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <span className="text-sm text-black/60">Загрузка карты…</span>
          </div>
        )}
      </div>

      {lastResult && (
        <div className="rounded-xl border border-blue-200 bg-blue-50/80 p-3">
          <div className="flex items-start gap-2">
            <MapPin className="h-5 w-5 shrink-0 text-blue-600" />
            <div className="min-w-0 flex-1 text-sm text-blue-900">
              <div className="font-medium">Адрес доставки</div>
              <div className="mt-2 border-t border-blue-200 pt-2 text-black/80">
                {lastResult.addressLine || 'Уточните адрес поиском или перетащите метку'}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

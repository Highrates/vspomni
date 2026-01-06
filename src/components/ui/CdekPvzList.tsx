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

// Популярные города для быстрого выбора
const POPULAR_CITIES = [
  'Москва',
  'Санкт-Петербург',
  'Новосибирск',
  'Екатеринбург',
  'Казань',
  'Нижний Новгород',
  'Челябинск',
  'Самара',
  'Омск',
  'Ростов-на-Дону',
]

export default function CdekPvzList({
  onChoose,
  defaultCity = 'Москва',
  initialMode = 'list',
}: CdekPvzListProps) {
  const [cities, setCities] = useState<City[]>([])
  const [citiesLoading, setCitiesLoading] = useState(true)
  const [citiesError, setCitiesError] = useState<string | null>(null)
  
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

  // Загрузка списка городов
  useEffect(() => {
    const fetchCities = async () => {
      setCitiesLoading(true)
      setCitiesError(null)
      
      try {
        const baseUrl = typeof window !== 'undefined' 
          ? window.location.origin
          : process.env.NEXT_PUBLIC_API_URL || ''
          
        const response = await fetch(
          `${baseUrl}/api/cdek/service?method=location/cities&size=10000&country_codes=RU`,
        )
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }
        
        const data = await response.json()
        const citiesList: City[] = Array.isArray(data) ? data : (data.items || [])
        
        if (citiesList.length === 0) {
          setCitiesError('Не удалось загрузить список городов')
          return
        }
        
        // Сортируем по алфавиту
        const sortedCities = citiesList.sort((a, b) => 
          a.city.localeCompare(b.city, 'ru')
        )
        
        setCities(sortedCities)
        
        // Находим город по умолчанию
        const defaultCityData = sortedCities.find(
          (c) => c.city.toLowerCase() === defaultCity.toLowerCase(),
        )
        
        if (defaultCityData) {
          setSelectedCity(defaultCityData)
        } else if (sortedCities.length > 0) {
          // Если не нашли, берём Москву или первый город
          const moscow = sortedCities.find(c => c.city === 'Москва')
          setSelectedCity(moscow || sortedCities[0])
        }
      } catch (error: any) {
        console.error('Error fetching cities:', error)
        setCitiesError('Ошибка загрузки городов')
      } finally {
        setCitiesLoading(false)
      }
    }

    fetchCities()
  }, [defaultCity])

  // Загрузка пунктов выдачи при выборе города
  useEffect(() => {
    if (!selectedCity) return

    const fetchPvzList = async () => {
      setPvzLoading(true)
      setPvzList([])
      
      let pvz: Pvz[] = []
      
      try {
        // 1. Сначала пробуем официальное API через наш сервер
        const baseUrl = typeof window !== 'undefined'
          ? window.location.origin
          : process.env.NEXT_PUBLIC_API_URL || ''
        
        let url = `${baseUrl}/api/cdek/service?action=offices&city_code=${selectedCity.code}&size=100`
        
        if (selectedCity.city_uuid) {
          url += `&city_uuid=${selectedCity.city_uuid}`
        }
        
        if (selectedCity.latitude && selectedCity.longitude) {
          url += `&latitude=${selectedCity.latitude}&longitude=${selectedCity.longitude}`
        }
        
        const response = await fetch(url)
        
        if (response.ok) {
          const data = await response.json()
          if (!data.error && Array.isArray(data)) {
            pvz = data
          }
        }
        
        console.log(`CDEK official API: Found ${pvz.length} points for ${selectedCity.city}`)
        
        // 2. Если официальное API не вернуло результатов - пробуем публичное API напрямую из браузера
        if (pvz.length === 0 && selectedCity.latitude && selectedCity.longitude) {
          console.log(`Trying CDEK public API for ${selectedCity.city}...`)
          
          const publicPvz = await fetchFromPublicApi(
            selectedCity.latitude, 
            selectedCity.longitude,
            selectedCity.city
          )
          
          if (publicPvz.length > 0) {
            pvz = publicPvz
            console.log(`CDEK public API: Found ${pvz.length} points for ${selectedCity.city}`)
          }
        }
        
        setPvzList(pvz)
        
      } catch (error: any) {
        console.error('Error fetching PVZ:', error)
        setPvzList([])
      } finally {
        setPvzLoading(false)
      }
    }

    fetchPvzList()
  }, [selectedCity])

  // Функция для загрузки ПВЗ через публичный API CDEK-виджета
  // Использует официальный endpoint виджета который работает с CORS
  const fetchFromPublicApi = async (lat: number, lng: number, cityName: string): Promise<Pvz[]> => {
    try {
      // Пробуем endpoint виджета СДЭК который поддерживает CORS
      const widgetApiUrl = `https://api.cdek.ru/v2/deliverypoints?latitude=${lat}&longitude=${lng}&radius=50`
      
      // Делаем запрос через наш сервер как прокси
      const baseUrl = typeof window !== 'undefined'
        ? window.location.origin
        : process.env.NEXT_PUBLIC_API_URL || ''
        
      const proxyUrl = `${baseUrl}/api/cdek/service?action=offices&latitude=${lat}&longitude=${lng}&radius=50`
      
      console.log('CDEK: Trying to fetch by coordinates via proxy:', { lat, lng })
      
      const response = await fetch(proxyUrl)
      
      if (!response.ok) {
        console.warn('CDEK proxy API failed:', response.status)
        return []
      }
      
      const data = await response.json()
      
      if (data.error) {
        console.warn('CDEK API returned error:', data.error)
        return []
      }
      
      let offices: Pvz[] = Array.isArray(data) ? data : []
      
      console.log(`CDEK coordinates search: Found ${offices.length} points near ${cityName}`)
      
      return offices
      
    } catch (error) {
      console.error('CDEK public API error:', error)
      return []
    }
  }

  // Фильтрация городов по поиску
  const filteredCities = useMemo(() => {
    if (!citySearchQuery.trim()) {
      // Показываем популярные города первыми
      const popular = cities.filter(c => 
        POPULAR_CITIES.some(p => c.city.toLowerCase() === p.toLowerCase())
      )
      const others = cities.filter(c => 
        !POPULAR_CITIES.some(p => c.city.toLowerCase() === p.toLowerCase())
      )
      return [...popular, ...others].slice(0, 50)
    }
    
    const query = citySearchQuery.toLowerCase().trim()
    return cities
      .filter(c => c.city.toLowerCase().includes(query))
      .slice(0, 50)
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
      workTime: pvz.work_time,
      phone: pvz.phone,
      postalCode: pvz.postal_code,
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
      workTime: pvz.work_time,
      phone: pvz.phone,
      postalCode: pvz.postal_code,
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
                  </div>
                </div>
                
                {/* Список городов */}
                <div className="overflow-y-auto max-h-60">
                  {filteredCities.length === 0 ? (
                    <div className="p-4 text-center text-black/50 text-sm">
                      Город не найден
                    </div>
                  ) : (
                    filteredCities.map((city) => (
                      <button
                        key={city.code}
                        type="button"
                        onClick={() => handleCitySelect(city)}
                        className={`w-full px-4 py-3 text-left hover:bg-black/5 transition flex items-center justify-between ${
                          selectedCity?.code === city.code ? 'bg-black/5 font-medium' : ''
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
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowWidget(false)}
              className={`flex-1 h-10 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2 ${
                !showWidget 
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
              className={`flex-1 h-10 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2 ${
                showWidget 
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
              <div className="flex flex-col gap-2 max-h-80 overflow-y-auto">
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

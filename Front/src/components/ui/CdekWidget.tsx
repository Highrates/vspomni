'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Loader2, MapPin, ExternalLink } from 'lucide-react'

// Типы для виджета СДЭК
declare global {
  interface Window {
    ISDEKWidjet: any
    CDEKWidget: any
  }
}

export interface CdekWidgetPvz {
  id: string
  code: string
  name: string
  city: string
  cityCode: string
  address: string
  postalCode?: string
  workTime?: string
  phone?: string
  type: string
  tariff?: number
  price?: number
}

interface CdekWidgetProps {
  onSelect: (pvz: CdekWidgetPvz) => void
  defaultCity?: string
  cityFrom?: string
  apiKey?: string
  tariffs?: {
    office?: number[]
    door?: number[]
  }
}

// API ключ для виджета (используйте свой ключ из ЛК СДЭК)
const CDEK_WIDGET_API_KEY = process.env.NEXT_PUBLIC_CDEK_WIDGET_API_KEY || ''

export default function CdekWidget({
  onSelect,
  defaultCity = 'Москва',
  cityFrom = 'Москва',
  apiKey = CDEK_WIDGET_API_KEY,
  tariffs,
}: CdekWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetRef = useRef<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedPvz, setSelectedPvz] = useState<CdekWidgetPvz | null>(null)

  // Обработчик выбора ПВЗ
  const handleSelect = useCallback((result: any) => {
    console.log('CDEK Widget selected:', result)
    
    if (!result) return

    // Парсим данные от виджета
    const pvz: CdekWidgetPvz = {
      id: result.id || result.PVZ?.id || '',
      code: result.code || result.PVZ?.code || result.id || '',
      name: result.name || result.PVZ?.name || result.Address || 'ПВЗ СДЭК',
      city: result.city || result.PVZ?.city || result.cityName || '',
      cityCode: result.cityCode || result.PVZ?.cityCode || result.cityId || '',
      address: result.address || result.PVZ?.address || result.Address || '',
      postalCode: result.postal || result.PVZ?.postal || '',
      workTime: result.workTime || result.PVZ?.workTime || '',
      phone: result.phone || result.PVZ?.phone || '',
      type: result.type || result.PVZ?.type || 'PVZ',
      tariff: result.tariff || result.tariffId,
      price: result.price || result.deliverySum,
    }

    setSelectedPvz(pvz)
    onSelect(pvz)
  }, [onSelect])

  // Загрузка скрипта виджета
  useEffect(() => {
    const loadWidget = async () => {
      setLoading(true)
      setError(null)

      try {
        // Проверяем, загружен ли уже скрипт
        if (!window.ISDEKWidjet) {
          // Загружаем скрипт виджета
          const script = document.createElement('script')
          script.id = 'ISDEKWidjet'
          script.src = 'https://widget.cdek.ru/widget/widjet.js'
          script.charset = 'utf-8'
          script.async = true

          await new Promise<void>((resolve, reject) => {
            script.onload = () => resolve()
            script.onerror = () => reject(new Error('Failed to load CDEK widget'))
            document.head.appendChild(script)
          })

          // Ждём инициализации
          await new Promise(resolve => setTimeout(resolve, 500))
        }

        // Проверяем что контейнер существует
        if (!containerRef.current) {
          throw new Error('Container not found')
        }

        // Очищаем предыдущий виджет если есть
        if (widgetRef.current) {
          try {
            widgetRef.current.close()
          } catch (e) {
            // ignore
          }
        }

        // Конфигурация виджета
        const config: any = {
          defaultCity: defaultCity,
          cityFrom: cityFrom,
          country: 'Россия',
          link: containerRef.current.id,
          path: 'https://widget.cdek.ru/widget/scripts/service.php',
          servicepath: 'https://widget.cdek.ru/widget/scripts/service.php',
          templatepath: 'https://widget.cdek.ru/widget/scripts/',
          choose: true,
          popup: false,
          onChoose: handleSelect,
          onCalculate: (result: any) => {
            console.log('CDEK Widget calculate:', result)
          },
        }

        // Добавляем API ключ если есть
        if (apiKey) {
          config.apikey = apiKey
        }

        // Добавляем тарифы если указаны
        if (tariffs) {
          if (tariffs.office) {
            config.goods = [{
              length: 20,
              width: 20,
              height: 10,
              weight: 1,
            }]
            config.tariffs = {
              office: tariffs.office,
              door: tariffs.door || [],
            }
          }
        }

        console.log('CDEK Widget config:', config)

        // Создаём виджет
        widgetRef.current = new window.ISDEKWidjet(config)

        setLoading(false)

      } catch (err: any) {
        console.error('CDEK Widget error:', err)
        setError(err.message || 'Ошибка загрузки виджета')
        setLoading(false)
      }
    }

    // Генерируем уникальный ID для контейнера
    if (containerRef.current && !containerRef.current.id) {
      containerRef.current.id = `cdek-widget-${Date.now()}`
    }

    loadWidget()

    // Cleanup
    return () => {
      if (widgetRef.current) {
        try {
          widgetRef.current.close()
        } catch (e) {
          // ignore
        }
      }
    }
  }, [defaultCity, cityFrom, apiKey, tariffs, handleSelect])

  // Если виджет не загружается - показываем альтернативную ссылку
  if (error) {
    return (
      <div className="border border-black/10 rounded-xl p-4 bg-gray-50">
        <div className="text-center space-y-3">
          <MapPin className="w-8 h-8 mx-auto text-black/30" />
          <div className="text-sm text-black/60">
            Не удалось загрузить виджет СДЭК
          </div>
          <div className="text-xs text-black/40">
            {error}
          </div>
          <a
            href="https://www.cdek.ru/ru/offices"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
          >
            <ExternalLink className="w-4 h-4" />
            Найти ПВЗ на сайте СДЭК
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Контейнер виджета */}
      <div 
        ref={containerRef}
        className="border border-black/10 rounded-xl overflow-hidden bg-white min-h-[400px] relative"
      >
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-green-600" />
              <span className="text-sm text-black/60">Загрузка карты СДЭК...</span>
            </div>
          </div>
        )}
      </div>

      {/* Выбранный ПВЗ */}
      {selectedPvz && (
        <div className="border border-green-200 bg-green-50 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <MapPin className="w-5 h-5 text-green-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-green-800">
                {selectedPvz.name}
              </div>
              <div className="text-sm text-green-700 mt-1">
                {selectedPvz.address}
              </div>
              {selectedPvz.workTime && (
                <div className="text-xs text-green-600 mt-1">
                  Режим работы: {selectedPvz.workTime}
                </div>
              )}
              {selectedPvz.price && (
                <div className="text-sm font-medium text-green-700 mt-2">
                  Стоимость доставки: {selectedPvz.price} ₽
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}



'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Loader2, CreditCard, ExternalLink } from 'lucide-react'

// Типы для виджета ЮKassa
declare global {
  interface Window {
    YooMoneyCheckoutWidget: any
  }
}

export interface YooKassaPaymentResult {
  paymentId?: string
  status?: string
  paid?: boolean
  amount?: {
    value: string
    currency: string
  }
}

interface YooKassaWidgetProps {
  confirmationToken: string
  returnUrl?: string
  onSuccess?: (result: YooKassaPaymentResult) => void
  onError?: (error: any) => void
  onClose?: () => void
  modal?: boolean
  customization?: {
    modal?: boolean
    [key: string]: any
  }
}

export default function YooKassaWidget({
  confirmationToken,
  returnUrl = typeof window !== 'undefined' ? window.location.origin + '/checkout/success' : '',
  onSuccess,
  onError,
  onClose,
  modal = false,
  customization,
}: YooKassaWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetRef = useRef<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isRendered, setIsRendered] = useState(false)

  // Обработчик успешной оплаты
  const handleSuccess = useCallback((result: YooKassaPaymentResult) => {
    console.log('YooKassa Widget success:', result)
    setIsRendered(false)
    if (onSuccess) {
      onSuccess(result)
    }
  }, [onSuccess])

  // Обработчик ошибки
  const handleError = useCallback((err: any) => {
    console.error('YooKassa Widget error:', err)
    setError(err.message || 'Ошибка при обработке платежа')
    setIsRendered(false)
    if (onError) {
      onError(err)
    }
  }, [onError])

  // Загрузка и инициализация виджета
  useEffect(() => {
    if (!confirmationToken) {
      setError('Не указан токен подтверждения')
      setLoading(false)
      return
    }

    const loadWidget = async () => {
      setLoading(true)
      setError(null)

      try {
        // Проверяем, загружен ли уже скрипт
        if (!window.YooMoneyCheckoutWidget) {
          // Загружаем скрипт виджета
          const existingScript = document.getElementById('YooMoneyCheckoutWidget')
          if (!existingScript) {
            const script = document.createElement('script')
            script.id = 'YooMoneyCheckoutWidget'
            script.src = 'https://yookassa.ru/checkout-widget/v1/checkout-widget.js'
            script.charset = 'utf-8'
            script.async = true

            await new Promise<void>((resolve, reject) => {
              script.onload = () => resolve()
              script.onerror = () => reject(new Error('Не удалось загрузить виджет ЮKassa'))
              document.head.appendChild(script)
            })
          }

          // Ждём инициализации виджета (проверяем несколько раз)
          let attempts = 0
          const maxAttempts = 20
          while (!window.YooMoneyCheckoutWidget && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 100))
            attempts++
          }

          if (!window.YooMoneyCheckoutWidget) {
            throw new Error('Виджет ЮKassa не загрузился')
          }

          // Проверяем, что это конструктор
          if (typeof window.YooMoneyCheckoutWidget !== 'function') {
            throw new Error('YooMoneyCheckoutWidget не является конструктором')
          }
        }

        // Проверяем что контейнер существует (если не модальный режим)
        if (!modal) {
          // Ждём пока контейнер появится в DOM
          let containerAttempts = 0
          const maxContainerAttempts = 10
          while (!containerRef.current && containerAttempts < maxContainerAttempts) {
            await new Promise(resolve => setTimeout(resolve, 100))
            containerAttempts++
          }
          
          if (!containerRef.current) {
            throw new Error('Контейнер не найден')
          }
        }

        // Очищаем предыдущий виджет если есть
        if (widgetRef.current) {
          try {
            widgetRef.current.destroy?.()
          } catch (e) {
            // ignore
          }
        }

        // Конфигурация виджета
        const config: any = {
          confirmation_token: confirmationToken,
          return_url: returnUrl,
          error_callback: handleError,
        }

        // Добавляем кастомизацию если указана
        if (customization || modal) {
          config.customization = {
            modal: modal || customization?.modal || false,
            ...customization,
          }
        }

        console.log('YooKassa Widget config:', config)

        // Проверяем, что YooMoneyCheckoutWidget доступен и является конструктором
        if (!window.YooMoneyCheckoutWidget || typeof window.YooMoneyCheckoutWidget !== 'function') {
          throw new Error('YooMoneyCheckoutWidget не доступен или не является конструктором')
        }

        // Создаём виджет
        widgetRef.current = new window.YooMoneyCheckoutWidget(config)

        // Рендерим виджет
        const renderTarget = modal ? undefined : (containerRef.current?.id || 'yookassa-widget-container')
        
        await widgetRef.current.render(renderTarget)
        
        setIsRendered(true)
        setLoading(false)

        // Обработчик успешной оплаты
        widgetRef.current.on('success', handleSuccess)

        // Обработчик закрытия модального окна
        widgetRef.current.on('modal_close', () => {
          if (onClose) {
            onClose()
          }
        })

      } catch (err: any) {
        console.error('YooKassa Widget error:', err)
        setError(err.message || 'Ошибка загрузки виджета')
        setLoading(false)
      }
    }

    // Генерируем уникальный ID для контейнера если нужно
    const containerId = `yookassa-widget-${Date.now()}`
    if (containerRef.current && !containerRef.current.id && !modal) {
      containerRef.current.id = containerId
    }

    // Небольшая задержка чтобы убедиться что контейнер отрендерился
    const timer = setTimeout(() => {
      loadWidget()
    }, 100)

    // Cleanup функция
    return () => {
      clearTimeout(timer)
      if (widgetRef.current) {
        try {
          widgetRef.current.destroy?.()
        } catch (e) {
          // ignore
        }
      }
    }
  }, [confirmationToken, returnUrl, modal, customization, handleSuccess, handleError, onClose])

  // Если виджет не загружается - показываем альтернативную ссылку
  if (error) {
    return (
      <div className="border border-black/10 rounded-xl p-4 bg-gray-50">
        <div className="text-center space-y-3">
          <CreditCard className="w-8 h-8 mx-auto text-black/30" />
          <div className="text-sm text-black/60">
            Не удалось загрузить виджет ЮKassa
          </div>
          <div className="text-xs text-black/40">
            {error}
          </div>
          <a
            href="https://yookassa.ru"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
          >
            <ExternalLink className="w-4 h-4" />
            Перейти на сайт ЮKassa
          </a>
        </div>
      </div>
    )
  }

  // Если модальный режим, не показываем контейнер
  if (modal) {
    return null
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
              <span className="text-sm text-black/60">Загрузка формы оплаты ЮKassa...</span>
            </div>
          </div>
        )}
        {isRendered && !loading && (
          <div className="text-xs text-black/40 p-2 text-center">
            Форма оплаты загружена
          </div>
        )}
      </div>
    </div>
  )
}

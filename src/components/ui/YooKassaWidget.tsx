'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Loader2, CreditCard, ExternalLink } from 'lucide-react'

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
  paymentId?: string | null
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
  paymentId = null,
  onSuccess,
  onError,
  onClose,
  modal = false,
  customization,
}: YooKassaWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetRef = useRef<any>(null)
  const paymentHandledRef = useRef(false)
  const onSuccessRef = useRef(onSuccess)
  const onErrorRef = useRef(onError)
  const onCloseRef = useRef(onClose)
  const paymentIdRef = useRef(paymentId)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  onSuccessRef.current = onSuccess
  onErrorRef.current = onError
  onCloseRef.current = onClose
  paymentIdRef.current = paymentId

  const finishWithSuccess = useCallback((result: YooKassaPaymentResult = {}) => {
    if (paymentHandledRef.current) return
    paymentHandledRef.current = true
    onSuccessRef.current?.({
      paymentId: result.paymentId || paymentIdRef.current || undefined,
      status: result.status || 'succeeded',
      paid: true,
      amount: result.amount,
    })
  }, [])

  const verifyPaymentStatus = useCallback(async () => {
    const id = paymentIdRef.current
    if (!id) return false

    try {
      const response = await fetch(
        `/api/yookassa/payment-status?paymentId=${encodeURIComponent(id)}`,
      )
      if (!response.ok) return false
      const data = await response.json()
      if (data.status === 'succeeded' || data.paid) {
        finishWithSuccess({
          paymentId: id,
          status: data.status,
          paid: true,
          amount: data.amount,
        })
        return true
      }
    } catch (err) {
      console.error('YooKassa payment status check failed:', err)
    }

    return false
  }, [finishWithSuccess])

  const verifyPaymentStatusWithRetry = useCallback(
    async (maxAttempts = 5, delayMs = 2000) => {
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        if (paymentHandledRef.current) return true
        const handled = await verifyPaymentStatus()
        if (handled) return true
        if (attempt < maxAttempts - 1) {
          await new Promise((resolve) => setTimeout(resolve, delayMs))
        }
      }
      return false
    },
    [verifyPaymentStatus],
  )

  const handleError = useCallback((err: any) => {
    console.error('YooKassa Widget error:', err)
    setError(err?.message || 'Ошибка при обработке платежа')
    onErrorRef.current?.(err)
  }, [])

  useEffect(() => {
    if (!confirmationToken) {
      setError('Не указан токен подтверждения')
      setLoading(false)
      return
    }

    paymentHandledRef.current = false

    const loadWidget = async () => {
      setLoading(true)
      setError(null)

      try {
        if (!window.YooMoneyCheckoutWidget) {
          const existingScript = document.getElementById('YooMoneyCheckoutWidget')
          if (!existingScript) {
            const script = document.createElement('script')
            script.id = 'YooMoneyCheckoutWidget'
            script.src = 'https://yookassa.ru/checkout-widget/v1/checkout-widget.js'
            script.charset = 'utf-8'
            script.async = true

            await new Promise<void>((resolve, reject) => {
              script.onload = () => resolve()
              script.onerror = () =>
                reject(new Error('Не удалось загрузить виджет ЮKassa'))
              document.head.appendChild(script)
            })
          }

          let attempts = 0
          while (!window.YooMoneyCheckoutWidget && attempts < 20) {
            await new Promise((resolve) => setTimeout(resolve, 100))
            attempts++
          }

          if (!window.YooMoneyCheckoutWidget) {
            throw new Error('Виджет ЮKassa не загрузился')
          }

          if (typeof window.YooMoneyCheckoutWidget !== 'function') {
            throw new Error('YooMoneyCheckoutWidget не является конструктором')
          }
        }

        if (!modal) {
          let containerAttempts = 0
          while (!containerRef.current && containerAttempts < 10) {
            await new Promise((resolve) => setTimeout(resolve, 100))
            containerAttempts++
          }

          if (!containerRef.current) {
            throw new Error('Контейнер не найден')
          }
        }

        if (widgetRef.current) {
          try {
            widgetRef.current.destroy?.()
          } catch {
            // ignore
          }
        }

        // return_url намеренно не передаём: с ним ЮKassa не шлёт success/complete/fail,
        // а редирект в embedded-режиме остаётся внутри iframe виджета.
        const config: any = {
          confirmation_token: confirmationToken,
          error_callback: handleError,
        }

        if (customization || modal) {
          config.customization = {
            modal: modal || customization?.modal || false,
            ...customization,
          }
        }

        widgetRef.current = new window.YooMoneyCheckoutWidget(config)

        widgetRef.current.on('success', (result: YooKassaPaymentResult) => {
          console.log('YooKassa Widget success event:', result)
          finishWithSuccess(result)
        })

        widgetRef.current.on('complete', () => {
          console.log('YooKassa Widget complete event')
          void verifyPaymentStatusWithRetry()
        })

        widgetRef.current.on('fail', (result: YooKassaPaymentResult) => {
          console.warn('YooKassa Widget fail event:', result)
        })

        widgetRef.current.on('modal_close', () => {
          if (paymentHandledRef.current) return
          void verifyPaymentStatusWithRetry().then((handled) => {
            if (!handled) onCloseRef.current?.()
          })
        })

        const renderTarget = modal
          ? undefined
          : containerRef.current?.id || 'yookassa-widget-container'

        await widgetRef.current.render(renderTarget)

        setLoading(false)
      } catch (err: any) {
        console.error('YooKassa Widget error:', err)
        setError(err.message || 'Ошибка загрузки виджета')
        setLoading(false)
      }
    }

    const containerId = `yookassa-widget-${Date.now()}`
    if (containerRef.current && !containerRef.current.id && !modal) {
      containerRef.current.id = containerId
    }

    const timer = setTimeout(() => {
      void loadWidget()
    }, 100)

    return () => {
      clearTimeout(timer)
      if (widgetRef.current) {
        try {
          widgetRef.current.destroy?.()
        } catch {
          // ignore
        }
      }
    }
  }, [
    confirmationToken,
    modal,
    customization,
    handleError,
    finishWithSuccess,
    verifyPaymentStatusWithRetry,
  ])

  if (error) {
    return (
      <div className="border border-black/10 rounded-xl p-4 bg-gray-50">
        <div className="text-center space-y-3">
          <CreditCard className="w-8 h-8 mx-auto text-black/30" />
          <div className="text-sm text-black/60">
            Не удалось загрузить виджет ЮKassa
          </div>
          <div className="text-xs text-black/40">{error}</div>
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

  if (modal) {
    return null
  }

  return (
    <div
      ref={containerRef}
      className="border border-black/10 rounded-xl overflow-hidden bg-white min-h-[400px] relative"
    >
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-green-600" />
            <span className="text-sm text-black/60">
              Загрузка формы оплаты ЮKassa...
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

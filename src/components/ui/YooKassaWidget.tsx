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

/** Цвета под UI Vspomni (кнопка «Оплатить» = чёрная, фон блоков #FAFAFA). */
export const VSPOMNI_YOOKASSA_COLORS = {
  control_primary: '#000000',
  control_primary_content: '#FFFFFF',
  background: '#FAFAFA',
  text: '#111111',
  border: '#E8E8E8',
  control_secondary: '#F0F0F0',
} as const

/**
 * Предпочтительный порядок: СБП выше ЮMoney.
 * Для одного метода в iframe нужен payment_methods (разрешает менеджер ЮKassa).
 * Без разрешения — показываем полный виджет с теми же colors.
 */
export const VSPOMNI_PAYMENT_METHOD_ORDER = [
  'sbp',
  'bank_card',
  'sberbank',
  'tinkoff_bank',
  'mir_pay',
  'yoo_money',
] as const

type YooPaymentMethod = (typeof VSPOMNI_PAYMENT_METHOD_ORDER)[number]

const METHOD_LABELS: Record<YooPaymentMethod, string> = {
  sbp: 'СБП',
  bank_card: 'Карта',
  sberbank: 'SberPay',
  tinkoff_bank: 'T-Pay',
  mir_pay: 'Mir Pay',
  yoo_money: 'ЮMoney',
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
    colors?: Record<string, string>
    payment_methods?: string[]
    [key: string]: any
  }
}

function getErrorBlob(err: unknown): string {
  if (!err) return ''
  if (typeof err === 'string') return err
  if (typeof err === 'object') {
    const o = err as Record<string, unknown>
    return [o.error, o.code, o.message].filter(Boolean).join(' ')
  }
  return String(err)
}

function isMethodsNotAllowedError(err: unknown): boolean {
  return /customization_of_payment_methods_not_allowed/i.test(getErrorBlob(err))
}

function isNoMethodsToDisplayError(err: unknown): boolean {
  return /no_payment_methods_to_display/i.test(getErrorBlob(err))
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
  /** null = полный список способов (fallback без payment_methods) */
  const [selectedMethod, setSelectedMethod] = useState<YooPaymentMethod | null>(
    'sbp',
  )
  const [methodsCustomizationAllowed, setMethodsCustomizationAllowed] =
    useState(true)

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
    if (isMethodsNotAllowedError(err)) {
      setMethodsCustomizationAllowed(false)
      setSelectedMethod(null)
      return
    }
    if (isNoMethodsToDisplayError(err)) {
      // Способ недоступен (например Mir Pay не на Android) — карта как запасной
      setSelectedMethod((prev) => (prev === 'bank_card' ? null : 'bank_card'))
      return
    }
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
    let cancelled = false

    const loadWidget = async () => {
      setLoading(true)
      setError(null)

      try {
        if (!window.YooMoneyCheckoutWidget) {
          const existingScript = document.getElementById('YooMoneyCheckoutWidget')
          if (!existingScript) {
            const script = document.createElement('script')
            script.id = 'YooMoneyCheckoutWidget'
            script.src =
              'https://yookassa.ru/checkout-widget/v1/checkout-widget.js'
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

        if (cancelled) return

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
          widgetRef.current = null
        }

        if (containerRef.current && !modal) {
          containerRef.current.innerHTML = ''
        }

        const colors = {
          ...VSPOMNI_YOOKASSA_COLORS,
          ...customization?.colors,
        }

        const useMethodFilter =
          methodsCustomizationAllowed &&
          selectedMethod != null &&
          !customization?.payment_methods

        const config: Record<string, unknown> = {
          confirmation_token: confirmationToken,
          error_callback: (err: unknown) => {
            if (isMethodsNotAllowedError(err)) {
              setMethodsCustomizationAllowed(false)
              setSelectedMethod(null)
              return
            }
            if (isNoMethodsToDisplayError(err)) {
              setSelectedMethod((prev) =>
                prev === 'bank_card' ? null : 'bank_card',
              )
              return
            }
            handleError(err)
          },
          customization: {
            modal: modal || customization?.modal || false,
            colors,
            ...(useMethodFilter ? { payment_methods: [selectedMethod] } : {}),
            ...(customization?.payment_methods
              ? { payment_methods: customization.payment_methods }
              : {}),
            ...Object.fromEntries(
              Object.entries(customization || {}).filter(
                ([key]) =>
                  key !== 'colors' &&
                  key !== 'modal' &&
                  key !== 'payment_methods',
              ),
            ),
          },
        }

        widgetRef.current = new window.YooMoneyCheckoutWidget(config)

        widgetRef.current.on('success', (result: YooKassaPaymentResult) => {
          finishWithSuccess(result)
        })

        widgetRef.current.on('complete', () => {
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

        if (!cancelled) setLoading(false)
      } catch (err: any) {
        console.error('YooKassa Widget error:', err)
        if (isMethodsNotAllowedError(err)) {
          setMethodsCustomizationAllowed(false)
          setSelectedMethod(null)
          return
        }
        if (isNoMethodsToDisplayError(err)) {
          setSelectedMethod((prev) => (prev === 'bank_card' ? null : 'bank_card'))
          return
        }
        if (!cancelled) {
          setError(err.message || 'Ошибка загрузки виджета')
          setLoading(false)
        }
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
      cancelled = true
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
    selectedMethod,
    methodsCustomizationAllowed,
    handleError,
    finishWithSuccess,
    verifyPaymentStatusWithRetry,
  ])

  if (error) {
    return (
      <div className="rounded-2xl border border-black/10 bg-[#FAFAFA] p-4 sm:p-5">
        <div className="text-center space-y-3">
          <CreditCard className="w-8 h-8 mx-auto text-black/30" />
          <div className="text-sm text-black/60">
            Не удалось загрузить виджет оплаты
          </div>
          <div className="text-xs text-black/40">{error}</div>
          <a
            href="https://yookassa.ru"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-[#3A7FE2] hover:underline"
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
    <div className="space-y-3 sm:space-y-4">
      {methodsCustomizationAllowed && (
        <div className="space-y-2">
          <p className="text-sm text-black/50">Способ оплаты</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {VSPOMNI_PAYMENT_METHOD_ORDER.filter((method) => {
              if (method !== 'mir_pay') return true
              if (typeof navigator === 'undefined') return false
              return /Android/i.test(navigator.userAgent)
            }).map((method) => {
              const active = selectedMethod === method
              return (
                <button
                  key={method}
                  type="button"
                  onClick={() => setSelectedMethod(method)}
                  className={`h-10 sm:h-11 rounded-full text-sm font-semibold transition border ${
                    active
                      ? 'bg-black text-white border-black'
                      : 'bg-white text-black/70 border-black/15 hover:border-black/40 hover:text-black'
                  }`}
                >
                  {METHOD_LABELS[method]}
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div
        className="rounded-2xl border border-black/10 overflow-hidden bg-[#FAFAFA] min-h-[360px] relative"
      >
        <div
          ref={containerRef}
          className="min-h-[360px] w-full [&_iframe]:min-h-[360px]"
        />
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#FAFAFA]/90 z-10">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-black" />
              <span className="text-sm text-black/60">Загрузка формы оплаты…</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { toast } from "react-toastify"
import { useRouter } from "next/navigation"
import { useAuthStore } from '@/stores/useAuth'

interface TProps {
  email: string
  onChangeEmail: () => void
  onBack?: () => void
}

const VerifyForm = ({ email, onChangeEmail, onBack }: TProps) => {
  const [code, setCode] = useState<string>("")
  const [timeLeft, setTimeLeft] = useState<number>(180)
  const [canResend, setCanResend] = useState<boolean>(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const router = useRouter()

  useEffect(() => {
    if (timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setCanResend(true)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } else {
      setCanResend(true)
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [timeLeft])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleResend = async () => {
    if (!canResend) return

    try {
      const baseUrl = process.env.NEXT_PUBLIC_SALEOR_API_URL ?? ''
      const resp = await fetch(`${baseUrl}/auth/request-email-code/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}))
        throw new Error(data.error || 'Ошибка при отправке кода')
      }

      setTimeLeft(180)
      setCanResend(false)
      toast.success('Код отправлен повторно на ' + email)
    } catch (error: any) {
      console.error('Resend error:', error)
      toast.error(error.message || 'Ошибка при отправке кода')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!code.trim()) {
      toast.error('Введите код подтверждения')
      return
    }
    try {
      // Получаем телефон из localStorage, если он был сохранен при регистрации
      const registrationPhone = localStorage.getItem('registration_phone') || ''
      localStorage.removeItem('registration_phone') // Очищаем после использования
      
      const baseUrl = process.env.NEXT_PUBLIC_SALEOR_API_URL ?? ''
      const resp = await fetch(`${baseUrl}/auth/verify-email-code/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code, phone: registrationPhone }),
      })

      const data = await resp.json().catch(() => ({}))

      if (!resp.ok || !data.ok) {
        throw new Error(data.error || 'Ошибка при подтверждении')
      }

      // Сохраняем токены как при обычном логине
      if (data.token) {
        localStorage.setItem('token', data.token)
      }
      if (data.refreshToken) {
        localStorage.setItem('refreshToken', data.refreshToken)
      }

      // Обновляем Zustand‑хранилище
      useAuthStore.setState({
        isAuthenticated: true,
        email,
      })

      toast.success('Email успешно подтвержден!')
      router.push('/profile')
    } catch (error: any) {
      console.error('Confirm error:', error)
      toast.error(error.message || 'Ошибка при подтверждении')
    }
  }
  return (
    <div className="space-y-8">
      {(onBack || true) && (
        <button
          type="button"
          onClick={() => onBack ? onBack() : router.back()}
          className="flex items-center gap-2 mb-4 text-gray-600 hover:text-black transition-colors"
        >
          <img src="/arrow-left-logo.svg" alt="arrow-left" className="w-5 h-5" />
          <span className="font-medium text-[16px]">вернуться назад</span>
        </button>
      )}
      
      <div className="text-start">
        <h1 className="text-4xl font-bold mb-8">ВСПОМНИ.</h1>
        <h2 className="text-2xl font-semibold mb-4">Подтверждение почты</h2>
        <p className="text-black/40 text-sm leading-relaxed">
          Мы отправили 'Одноразовый код доступа' на указанный вами бизнес-адрес электронной почты.
        </p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-gray-600 mb-1">Код</label>
          <input
            type="text"
            placeholder={email}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="w-full px-4 py-3 bg-gray-100 border-0 rounded"
            required
          />
        </div>
        <div className="flex items-center justify-between text-sm">
          <button
            type="button"
            onClick={handleResend}
            disabled={!canResend}
            className={`font-light flex gap-1 ${
              canResend
                ? 'text-blue-600 hover:text-blue-700 cursor-pointer'
                : 'text-gray-400 cursor-not-allowed'
            }`}
          >
            <p className="text-black/40">Не пришел код?</p>{' '}
            <span className={canResend ? 'underline' : ''}>Отправить еще раз</span>
          </button>
          {!canResend && (
            <span className="text-gray-600 font-medium">{formatTime(timeLeft)}</span>
          )}
        </div>
        <button
          type="submit"
          className="w-full bg-black text-white rounded-full py-3 text-base font-medium hover:bg-gray-900 transition-colors mt-5"
        >
          Подтвердить
        </button>
        <button
          type="button"
          onClick={onChangeEmail}
          className="w-full text-start text-black/40 text-sm font-medium py-2"
        >
          Сменить Email
        </button>
      </form>
    </div>
  )
}



export default VerifyForm
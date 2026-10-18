"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import Image from "next/image"
import { toast } from "react-toastify"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuthStore } from '@/stores/useAuth'
import { useUserStore } from '@/stores/useUser'
import { formatPhoneInputValue } from '@/lib/ruPhone'
import {
  completeRegistrationWithPassword,
  confirmEmailRequest,
  peekCompletionToken,
  updateBuyerProfile,
  verifyEmailCodeAndComplete,
} from '@/api/authApi'
import { firstPasswordError } from '@/lib/auth/passwordPolicy'
import { nextFromSearchParams } from '@/lib/auth/safeNextPath'

interface TProps {
  email: string
  onChangeEmail: () => void
  onBack?: () => void
}

const VerifyForm = ({ email, onChangeEmail, onBack }: TProps) => {
  const [code, setCode] = useState<string>("")
  const [password, setPassword] = useState<string>("")
  const [needPassword, setNeedPassword] = useState<boolean>(false)
  const [timeLeft, setTimeLeft] = useState<number>(180)
  const [canResend, setCanResend] = useState<boolean>(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const nextPath = nextFromSearchParams(searchParams)

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
      const res = await confirmEmailRequest(email)
      if (!res.otpSent) {
        toast.info(res.message || 'Не удалось отправить код. Попробуйте позже.')
        return
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
    if (!needPassword && !code.trim()) {
      toast.error('Введите код подтверждения')
      return
    }
    try {
      // Nest: register/verify → register/complete (пароль из памяти вкладки) → JWT
      // Если страницу перезагрузили, пароля в памяти нет — просим ввести его здесь же.
      let result
      if (needPassword) {
        if (firstPasswordError(password)) {
          throw new Error(firstPasswordError(password) as string)
        }
        result = await completeRegistrationWithPassword(email, password)
      } else {
        try {
          result = await verifyEmailCodeAndComplete(email, code)
        } catch (err) {
          if (peekCompletionToken()) {
            setNeedPassword(true)
            toast.info('Введите пароль, чтобы завершить регистрацию')
            return
          }
          throw err
        }
      }

      const registrationPhone = localStorage.getItem('registration_phone') || ''
      localStorage.removeItem('registration_phone')
      let profile: { firstName?: string; lastName?: string } = {}
      try {
        profile = JSON.parse(sessionStorage.getItem('registration_profile') || '{}')
      } catch {
        /* ignore */
      }
      sessionStorage.removeItem('registration_profile')

      // Имя/телефон из формы регистрации → профиль покупателя (не критично при ошибке)
      if (registrationPhone || profile.firstName || profile.lastName) {
        try {
          await updateBuyerProfile({
            firstName: profile.firstName,
            lastName: profile.lastName,
            ...(registrationPhone ? { phone: registrationPhone } : {}),
          })
        } catch (profileError) {
          console.warn('Registration profile save failed:', profileError)
        }
      }

      // Обновляем Zustand‑хранилище (не тянем телефон предыдущего пользователя из persist)
      useAuthStore.setState({
        isAuthenticated: true,
        email: result.user.email || email,
      })
      useUserStore.getState().setUser({
        userId: '0',
        name: profile.firstName || '',
        familyName: profile.lastName || '',
        email,
        phone: registrationPhone ? formatPhoneInputValue(registrationPhone) : '',
      })
      void useUserStore.getState().fetchUser()

      toast.success('Email успешно подтвержден!')
      router.push(nextPath)
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
        <div className="mb-8">
          <Image
            src="/logo/logo-vspomni.svg"
            alt="ВСПОМНИ."
            width={150}
            height={30}
            className="h-8 w-auto"
            style={{ width: 'auto', height: 'auto' }}
          />
        </div>
        <h2 className="text-2xl font-semibold mb-4">Подтверждение почты</h2>
        <p className="text-black/40 text-sm leading-relaxed">
          Мы отправили одноразовый код на {email}
        </p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        {needPassword ? (
          <div>
            <label className="block text-sm text-gray-600 mb-1">Пароль</label>
            <input
              type="password"
              placeholder="Минимум 8 символов, буква и цифра"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-gray-100 border-0 rounded"
              required
            />
          </div>
        ) : (
        <div>
          <label className="block text-sm text-gray-600 mb-1">Код</label>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="000000"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="w-full px-4 py-3 bg-gray-100 border-0 rounded"
            required
          />
        </div>
        )}
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
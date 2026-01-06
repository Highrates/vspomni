"use client"

import type React from "react"
import { useState } from "react"
import { toast } from "react-toastify"
import { useRouter } from "next/navigation"

interface TProps {
  onResetPassword: (email: string) => void
  onBack?: () => void
}

const ForgotPasswordForm = ({ onResetPassword, onBack }: TProps) => {
  const [email, setEmail] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) {
      toast.error('Введите email')
      return
    }

    setLoading(true)
    try {
      const baseUrl = process.env.NEXT_PUBLIC_SALEOR_API_URL ?? ''
      const resp = await fetch(`${baseUrl}/auth/forgot-password/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const data = await resp.json().catch(() => ({}))

      if (!resp.ok || !data.ok) {
        const errorMsg = data.error || 'Ошибка при отправке письма'
        // Переводим ошибки на русский
        if (errorMsg.includes('not found') || errorMsg.includes('не найден')) {
          throw new Error('Пользователь с таким email не найден')
        }
        throw new Error(errorMsg)
      }

      toast.success('Инструкции по сбросу пароля отправлены на вашу почту')
      onResetPassword(email)
    } catch (error: any) {
      console.error('Forgot password error:', error)
      toast.error(error.message || 'Ошибка при отправке письма')
    } finally {
      setLoading(false)
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
        <h2 className="text-2xl font-semibold mb-4">Забыли пароль</h2>
        <p className="text-gray-600 text-sm leading-relaxed">
          Введите адрес электронной почты, с которым вы зарегистрировались, и мы отправим вам инструкции по сбросу
          пароля.
        </p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-gray-600 mb-1">Email</label>
          <input
            type="email"
            placeholder="example@mail.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 bg-gray-100 border-0 rounded"
            required
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-black text-white rounded-full py-3 text-base font-medium hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Отправка...' : 'Выслать инструкцию'}
        </button>
      </form>
    </div>
  )
}

export default ForgotPasswordForm
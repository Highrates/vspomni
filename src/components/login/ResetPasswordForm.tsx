"use client"

import type React from "react"
import { useState } from "react"
import { toast } from "react-toastify"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuthStore } from "@/stores/useAuth"

interface TProps {
  email: string
  onBack?: () => void
}

const ResetPasswordForm = ({ email: emailProp, onBack }: TProps) => {
  const [newPassword, setNewPassword] = useState<string>("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token') || ''
  const emailFromUrl = searchParams.get('email') || ''
  // Используем email из URL, если он есть, иначе из пропсов
  const email = emailFromUrl || emailProp
  const { login } = useAuthStore()
  
  // Если пользователь пришел по ссылке с токеном, не показываем кнопку "вернуться назад"
  const cameFromLink = !!token && !!emailFromUrl

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (newPassword !== confirmPassword) {
      toast.error('Пароли не совпадают')
      return
    }

    if (newPassword.length < 8) {
      toast.error('Пароль должен содержать не менее 8 символов')
      return
    }

    if (!token) {
      toast.error('Токен сброса пароля не найден. Пожалуйста, запросите сброс пароля заново.')
      return
    }

    setLoading(true)
    try {
      const baseUrl = process.env.NEXT_PUBLIC_SALEOR_API_URL ?? ''
      const resp = await fetch(`${baseUrl}/auth/reset-password/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, token, newPassword }),
      })

      const data = await resp.json().catch(() => ({}))

      if (!resp.ok || !data.ok) {
        const errorMsg = data.error || 'Ошибка при сбросе пароля'
        // Переводим ошибки на русский
        if (errorMsg.includes('token') || errorMsg.includes('токен')) {
          throw new Error('Неверный или просроченный токен. Пожалуйста, запросите сброс пароля заново.')
        }
        if (errorMsg.includes('too short')) {
          throw new Error('Пароль слишком короткий. Он должен содержать не менее 8 символов.')
        }
        throw new Error(errorMsg)
      }

      toast.success('Пароль успешно изменен! Вход в систему...')
      
      // Автоматически входим пользователя с новым паролем
      try {
        await login(email, newPassword)
        toast.success('Вы успешно вошли в систему!')
        // Перенаправляем на главную страницу
        router.push('/')
      } catch (loginError: any) {
        console.error('Auto-login after password reset failed:', loginError)
        // Если автоматический вход не удался, перенаправляем на страницу логина
        toast.info('Пароль изменен. Пожалуйста, войдите в систему.')
        router.push('/login')
      }
    } catch (error: any) {
      console.error('Reset password error:', error)
      toast.error(error.message || 'Ошибка при сбросе пароля')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      {!cameFromLink && onBack && (
        <button
          type="button"
          onClick={() => onBack()}
          className="flex items-center gap-2 mb-4 text-gray-600 hover:text-black transition-colors"
        >
          <img src="/arrow-left-logo.svg" alt="arrow-left" className="w-5 h-5" />
          <span className="font-medium text-[16px]">вернуться назад</span>
        </button>
      )}
      
      <div className="text-start">
        <h1 className="text-4xl font-bold mb-8">ВСПОМНИ.</h1>
        <h2 className="text-2xl font-semibold">Придумайте пароль</h2>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4 ">
        <div>
          <label className="block text-sm text-gray-600 mb-1">Новый пароль</label>
          <input
            type="password"
            placeholder="Минимум 8 символов"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full px-4 py-3 bg-gray-100 border-0 rounded"
            required
            minLength={8}
          />
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">Повторите пароль</label>
          <input
            type="password"
            placeholder="Повторите пароль"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full px-4 py-3 bg-gray-100 border-0 rounded"
            required
            minLength={8}
          />
        </div>
        <button
          type="submit"
          disabled={newPassword !== confirmPassword || !newPassword || loading}
          className="w-full bg-black text-white rounded-full py-3 text-base font-medium hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Сохранение...' : 'Сохранить пароль и войти'}
        </button>
      </form>
    </div>
  )
}

export default ResetPasswordForm
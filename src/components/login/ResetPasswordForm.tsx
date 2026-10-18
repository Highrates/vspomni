"use client"

import type React from "react"
import { useState } from "react"
import Image from "next/image"
import { toast } from "react-toastify"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuthStore } from "@/stores/useAuth"
import { setPassword } from "@/api/authApi"
import { nextFromSearchParams } from "@/lib/auth/safeNextPath"

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
  const cameFromLink = !!token

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
      // Nest: POST /auth/password-reset/confirm { token, password }
      const result = await setPassword(token, newPassword)
      const loginEmail = (result.email || email || '').trim()
      const nextPath = nextFromSearchParams(searchParams)

      if (!loginEmail) {
        toast.success('Пароль изменён. Войдите с новым паролем.')
        const q = nextPath !== '/' ? `?next=${encodeURIComponent(nextPath)}` : ''
        router.push(`/login${q}`)
        return
      }

      toast.success('Пароль успешно изменен! Вход в систему...')

      try {
        await login(loginEmail, newPassword)
        toast.success('Вы успешно вошли в систему!')
        router.push(nextPath)
      } catch (loginError: unknown) {
        console.error('Auto-login after password reset failed:', loginError)
        toast.info('Пароль изменен. Пожалуйста, войдите в систему.')
        const q = nextPath !== '/' ? `?next=${encodeURIComponent(nextPath)}` : ''
        router.push(`/login${q}`)
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
'use client'

import { FormEvent, useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useAuthStore } from '@/stores/useAuth'
import { useRouter } from 'next/navigation'
import { CustomButton as Button } from '../common/CustomButton'
import YandexIdLoginButton from '@/components/login/YandexIdLoginButton'
import { toast } from 'react-toastify'

interface TProps {
  onForgotPass: () => void
  onRegister: () => void
}

export const LoginForm = ({ onForgotPass, onRegister }: TProps) => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const { isAuthenticated, login } = useAuthStore()

  const router = useRouter()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    try {
      await login(email, password)
      toast.success('Успешный вход в систему!')
      router.push('/')
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Попробуйте еще раз'
      toast.error(`Ошибка входа: ${message}`)
    }
  }

  useEffect(() => {
    if (isAuthenticated) router.push('/')
  }, [isAuthenticated, router])

  return (
    <div className="space-y-8">
      <button
        type="button"
        onClick={() => router.back()}
        className="flex items-center gap-2 mb-4 text-gray-600 hover:text-black transition-colors"
      >
        <img src="/arrow-left-logo.svg" alt="" className="w-5 h-5" />
        <span className="font-medium text-[16px]">вернуться назад</span>
      </button>
      <div className="text-start">
        <div className="mb-8">
          <Link href="/" aria-label="ВСПОМНИ — на главную">
            <Image
              src="/logo/logo-vspomni.svg"
              alt="ВСПОМНИ."
              width={150}
              height={30}
              className="h-8 w-auto"
            />
          </Link>
        </div>
        <h2 className="text-2xl font-semibold mb-2">Вход в аккаунт</h2>
        <p className="text-gray-500 mb-6">
          Впервые у нас?{' '}
          <button
            onClick={onRegister}
            className="text-blue-500 hover:text-blue-600 font-medium"
          >
            Зарегистрироваться
          </button>
        </p>
        <YandexIdLoginButton />
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
          />
        </div>

        <div>
          <label className="block text-sm text-gray-600 mb-1">Пароль</label>
          <input
            type="password"
            placeholder="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 bg-gray-100 border-0 rounded"
          />
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={onForgotPass}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            Забыли пароль?
          </button>
        </div>
        <Button type="submit" className="w-full justify-center">
          <h2 className="font-semibold">Войти</h2>
        </Button>
      </form>
    </div>
  )
}

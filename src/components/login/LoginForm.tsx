'use client'

import { FormEvent, useState, useEffect } from 'react'
import Image from 'next/image'
import { useAuthStore } from '@/stores/useAuth'
import { useRouter } from 'next/navigation'
import { CustomButton as Button } from '../common/CustomButton'
import { getToken, getYandexAuthUrl } from '@/graphql/queries/auth.service'
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
      login(email, password)
        .then(() => {
          toast.success('Успешный вход в систему!')
        })
        .catch((error) => {
          toast.error(`Ошибка входа: ${error.message || 'Попробуйте еще раз'}`)
        })
      router.push('/')
    } catch (error: any) {
      console.error('Login error:', error)
      alert(error.message || 'Login failed')
    }
  }

  useEffect(() => {
    isAuthenticated ? router.push('/') : null
  }, [isAuthenticated])

  const handleYandexLogin = async () => {
    try {
      const redirectUri = `${window.location.origin}/login`
      const authUrl = await getYandexAuthUrl(redirectUri)
      // Сохраняем текущий URL для возврата после авторизации
      sessionStorage.setItem('yandex_auth_return_url', window.location.pathname)
      window.location.href = authUrl
    } catch (error: any) {
      console.error('Yandex auth error:', error)
      toast.error(error.message || 'Ошибка при авторизации через Яндекс')
    }
  }

  return (
    <div className="space-y-8">
      <div className="text-start">
        <div className="mb-8">
          <Image
            src="/logo/logo-vspomni.svg"
            alt="ВСПОМНИ."
            width={150}
            height={30}
            className="h-8 w-auto"
          />
        </div>
        <h2 className="text-2xl font-semibold mb-2">Вход в аккаунт</h2>
        <p className="text-gray-500">
          Впервые у нас?{' '}
          <button
            onClick={onRegister}
            className="text-blue-500 hover:text-blue-600 font-medium"
          >
            Зарегистрироваться
          </button>
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

      {/* Яндекс авторизация */}
      <div className="flex items-center gap-4 my-6">
        <div className="flex-1 h-px bg-gray-300"></div>
        <span className="text-sm text-gray-500">или</span>
        <div className="flex-1 h-px bg-gray-300"></div>
      </div>

      <button
        type="button"
        onClick={handleYandexLogin}
        className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-full font-medium transition-colors duration-200 bg-[#FFCC00] text-black hover:bg-[#FFD633]"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M10 0C4.48 0 0 4.48 0 10C0 15.52 4.48 20 10 20C15.52 20 20 15.52 20 10C20 4.48 15.52 0 10 0ZM10 18C5.59 18 2 14.41 2 10C2 5.59 5.59 2 10 2C14.41 2 18 5.59 18 10C18 14.41 14.41 18 10 18Z" fill="currentColor"/>
          <path d="M10 5L7 10L10 15L13 10L10 5Z" fill="currentColor"/>
        </svg>
        <span>Войти через Яндекс</span>
      </button>
    </div>
  )
}

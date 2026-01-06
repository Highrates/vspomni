'use client'

import { FormEvent, useState, useEffect } from 'react'
import { useAuthStore } from '@/stores/useAuth'
import { useRouter } from 'next/navigation'
import { CustomButton as Button } from '../common/CustomButton'
import { getToken } from '@/graphql/queries/auth.service'
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

  return (
    <div className="space-y-8">
      <div className="text-start">
        <h1 className="text-4xl font-bold mb-8">ВСПОМНИ.</h1>
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
    </div>
  )
}

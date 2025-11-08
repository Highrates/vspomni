'use client'

import { FormEvent, useState, useEffect } from 'react'
import { useAuthStore } from '@/stores/useAuth';
import { useRouter } from 'next/navigation'
import Button from '../ui/Button'

interface TProps {
  onForgotPass: () => void
  onRegister: () => void
}

export const LoginForm = ({ onForgotPass, onRegister }: TProps) => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const { isAuthenticated , login } = useAuthStore();

  const router = useRouter();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    login()
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
      <div className="space-y-3">
        <button className="w-full py-3 px-4 border-2 border-black rounded-full font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2">
          <svg
            width="17"
            height="18"
            viewBox="0 0 17 18"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M8.59155 7.0293V10.3567H13.2155C13.0125 11.4268 12.4032 12.3329 11.4893 12.9421L14.2778 15.1057C15.9024 13.6061 16.8397 11.4034 16.8397 8.78681C16.8397 8.17758 16.7851 7.59172 16.6835 7.02939L8.59155 7.0293Z"
              fill="#4285F4"
            />
            <path
              d="M3.77665 10.2266L3.14775 10.708L0.921631 12.4419C2.33538 15.246 5.23298 17.1831 8.5916 17.1831C10.9114 17.1831 12.8562 16.4177 14.2778 15.1055L11.4894 12.9419C10.7239 13.4574 9.74755 13.7698 8.5916 13.7698C6.35772 13.7698 4.45975 12.2624 3.78016 10.2315L3.77665 10.2266Z"
              fill="#34A853"
            />
            <path
              d="M0.921608 4.74121C0.33583 5.89716 0 7.20159 0 8.59189C0 9.98219 0.33583 11.2866 0.921608 12.4426C0.921608 12.4503 3.78041 10.2243 3.78041 10.2243C3.60858 9.70878 3.50701 9.16206 3.50701 8.5918C3.50701 8.02153 3.60858 7.47481 3.78041 6.9593L0.921608 4.74121Z"
              fill="#FBBC05"
            />
            <path
              d="M8.59178 3.42113C9.85714 3.42113 10.9819 3.85853 11.8801 4.7021L14.3405 2.24173C12.8486 0.851431 10.9116 0 8.59178 0C5.23316 0 2.33538 1.92927 0.921631 4.74117L3.78035 6.95944C4.45985 4.92861 6.3579 3.42113 8.59178 3.42113Z"
              fill="#EA4335"
            />
          </svg>
          Продолжить с Google
        </button>
        <button className="w-full py-3 px-4 border-2 border-black rounded-full font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2">
          <svg
            width="17"
            height="17"
            viewBox="0 0 17 17"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <g clipPath="url(#clip0_72_3992)">
              <path
                d="M8.5 17C13.1944 17 17 13.1944 17 8.5C17 3.80558 13.1944 0 8.5 0C3.80558 0 0 3.80558 0 8.5C0 13.1944 3.80558 17 8.5 17Z"
                fill="url(#paint0_linear_72_3992)"
              />
              <path
                d="M6.94168 12.3962C6.66628 12.3962 6.7131 12.2922 6.61812 12.03L5.80835 9.36499L12.0417 5.66699"
                fill="#CBD9E8"
              />
              <path
                d="M6.94165 12.3955C7.15415 12.3955 7.248 12.2983 7.36665 12.183L8.49998 11.081L7.08629 10.2285"
                fill="#AFC9DE"
              />
              <path
                d="M7.08618 10.2286L10.5117 12.7594C10.9026 12.9751 11.1847 12.8634 11.2821 12.3965L12.6764 5.82581C12.8191 5.25348 12.4583 4.9938 12.0843 5.16359L3.89663 8.3207C3.33775 8.54489 3.34108 8.8567 3.79477 8.9956L5.8959 9.65145L10.7602 6.58259C10.9899 6.44334 11.2007 6.51814 11.0277 6.6717"
                fill="white"
              />
            </g>
            <defs>
              <linearGradient
                id="paint0_linear_72_3992"
                x1="8.5"
                y1="0"
                x2="8.5"
                y2="16.8739"
                gradientUnits="userSpaceOnUse"
              >
                <stop stopColor="#2AABEE" />
                <stop offset="1" stopColor="#229ED9" />
              </linearGradient>
              <clipPath id="clip0_72_3992">
                <rect width="17" height="17" fill="white" />
              </clipPath>
            </defs>
          </svg>
          Продолжить с Telegram
        </button>
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
        <Button className="w-full justify-center">
          <h2 className="font-semibold">Войти</h2>
        </Button>
      </form>
    </div>
  )
}

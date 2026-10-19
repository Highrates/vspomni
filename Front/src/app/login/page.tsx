'use client'

import ForgotPasswordForm from '@/components/login/ForgotPasswordForm'
import { LoginForm } from '@/components/login/LoginForm'
import RegisterForm from '@/components/login/RegisterForm'
import ResetPasswordForm from '@/components/login/ResetPasswordForm'
import VerifyForm from '@/components/login/VerifyForm'
import { useState, useEffect, Suspense, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { completeYandexOauth } from '@/api/authApi'
import { useAuthStore } from '@/stores/useAuth'
import { toast } from 'react-toastify'

type TAuthsteps = 'login' | 'register' | 'verify' | 'forgot' | 'reset'

const LoginContent = () => {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState<TAuthsteps>('login')
  const [email, setEmail] = useState<string>('')
  const [yandexBusy, setYandexBusy] = useState(false)
  const yandexHandled = useRef(false)

  // Ссылка из письма Nest: /login?token=…
  // Callback Яндекс ID: /login?code&state
  useEffect(() => {
    const token = searchParams.get('token')
    const emailParam = searchParams.get('email')
    const code = searchParams.get('code')
    const state = searchParams.get('state')

    if (code && state) {
      if (yandexHandled.current) return
      yandexHandled.current = true
      setYandexBusy(true)
      void (async () => {
        try {
          const result = await completeYandexOauth(code, state)
          useAuthStore.setState({
            isAuthenticated: true,
            email: result.user?.email || null,
          })
          void import('@/stores/useUser').then(({ useUserStore }) => {
            useUserStore.getState().clearUser()
          })
          toast.success('Успешный вход через Яндекс ID')
          const next =
            result.next && result.next.startsWith('/') && !result.next.startsWith('//')
              ? result.next
              : '/'
          router.replace(next)
        } catch (error: unknown) {
          console.error('Yandex callback error:', error)
          const message =
            error instanceof Error
              ? error.message
              : 'Ошибка при авторизации через Яндекс'
          toast.error(message)
          setYandexBusy(false)
          router.replace('/login')
        }
      })()
      return
    }

    if (token) {
      setEmail(emailParam || '')
      setCurrentStep('reset')
    } else {
      setCurrentStep((step) => (step === 'reset' ? 'login' : step))
    }
  }, [searchParams, router])

  const handleSwitchToRegister = () => setCurrentStep('register')
  const handleSwitchToLogin = () => setCurrentStep('login')
  const handleSwitchToForgotPassword = () => setCurrentStep('forgot')
  const handleVerifyEmail = (userEmail: string) => {
    setEmail(userEmail)
    setCurrentStep('verify')
  }

  if (yandexBusy) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-white px-4">
        <div className="w-full md:max-w-3/5 lg:max-w-2/5 text-center">
          <h1 className="text-4xl font-bold mb-8">ВСПОМНИ.</h1>
          <p className="text-gray-500">Вход через Яндекс ID…</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-white px-4">
      <div className="w-full md:max-w-3/5 lg:max-w-2/5">
        {currentStep === 'login' && (
          <LoginForm
            onForgotPass={handleSwitchToForgotPassword}
            onRegister={handleSwitchToRegister}
          />
        )}
        {currentStep == 'register' && (
          <RegisterForm
            onVerify={handleVerifyEmail}
            onLogin={handleSwitchToLogin}
          />
        )}
        {currentStep == 'verify' && (
          <VerifyForm
            email={email}
            onChangeEmail={() => setCurrentStep('register')}
            onBack={() => setCurrentStep('register')}
          />
        )}
        {currentStep === 'forgot' && (
          <ForgotPasswordForm onBack={handleSwitchToLogin} />
        )}
        {currentStep == 'reset' && (
          <ResetPasswordForm
            email={email}
            onBack={() => setCurrentStep('forgot')}
          />
        )}
      </div>
    </main>
  )
}

const Login = () => {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex items-center justify-center bg-white px-4">
          <div className="w-full md:max-w-3/5 lg:max-w-2/5">
            <div className="text-center">
              <h1 className="text-4xl font-bold mb-8">ВСПОМНИ.</h1>
              <p className="text-gray-500">Загрузка...</p>
            </div>
          </div>
        </main>
      }
    >
      <LoginContent />
    </Suspense>
  )
}

export default Login

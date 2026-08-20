'use client'

import ForgotPasswordForm from '@/components/login/ForgotPasswordForm'
import { LoginForm } from '@/components/login/LoginForm'
import RegisterForm from '@/components/login/RegisterForm'
import ResetPasswordForm from '@/components/login/ResetPasswordForm'
import VerifyForm from '@/components/login/VerifyForm'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { exchangeYandexCode } from '@/graphql/queries/auth.service'
import { useAuthStore } from '@/stores/useAuth'
import { toast } from 'react-toastify'

type TAuthsteps = 'login' | 'register' | 'verify' | 'forgot' | 'reset'

const LoginContent = () => {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState<TAuthsteps>('login')
  const [email, setEmail] = useState<string>('')

  // Проверяем URL параметры при загрузке страницы
  useEffect(() => {
    const token = searchParams.get('token')
    const emailParam = searchParams.get('email')
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    
    // Обработка callback от Яндекс OAuth
    if (code && state) {
      const handleYandexCallback = async () => {
        try {
          const result = await exchangeYandexCode(code, state)
          
          if (result && result.token && result.refreshToken) {
            // Сохраняем токены
            localStorage.setItem('token', result.token)
            localStorage.setItem('refreshToken', result.refreshToken)
            
            // Обновляем состояние авторизации
            useAuthStore.setState({
              isAuthenticated: true,
              email: result.user?.email || null,
            })
            
            toast.success('Успешная авторизация через Яндекс!')
            
            // Возвращаемся на сохраненный URL или на главную
            const returnUrl = sessionStorage.getItem('yandex_auth_return_url') || '/'
            sessionStorage.removeItem('yandex_auth_return_url')
            
            // Очищаем URL параметры и перенаправляем
            router.replace(returnUrl)
          } else {
            throw new Error('Не удалось получить токены авторизации')
          }
        } catch (error: any) {
          console.error('Yandex callback error:', error)
          toast.error(error.message || 'Ошибка при авторизации через Яндекс')
          // Очищаем URL параметры при ошибке
          router.replace('/login')
        }
      }
      
      handleYandexCallback()
    } else if (token && emailParam) {
      // Если есть токен и email в URL, переключаемся на форму сброса пароля
      setEmail(emailParam)
      setCurrentStep('reset')
    }
  }, [searchParams, router])

  const handleSwitchToRegister = () => setCurrentStep('register')
  const handleSwitchToLogin = () => setCurrentStep('login')
  const handleSwitchToForgotPassword = () => setCurrentStep('forgot')
  const handleVerifyEmail = (userEmail: string) => {
    setEmail(userEmail)
    setCurrentStep('verify')
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
    <Suspense fallback={
      <main className="min-h-screen flex items-center justify-center bg-white px-4">
        <div className="w-full md:max-w-3/5 lg:max-w-2/5">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-8">ВСПОМНИ.</h1>
            <p className="text-gray-500">Загрузка...</p>
          </div>
        </div>
      </main>
    }>
      <LoginContent />
    </Suspense>
  )
}

export default Login
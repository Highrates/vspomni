'use client'

import ForgotPasswordForm from '@/components/login/ForgotPasswordForm'
import { LoginForm } from '@/components/login/LoginForm'
import RegisterForm from '@/components/login/RegisterForm'
import ResetPasswordForm from '@/components/login/ResetPasswordForm'
import VerifyForm from '@/components/login/VerifyForm'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

type TAuthsteps = 'login' | 'register' | 'verify' | 'forgot' | 'reset'

const LoginContent = () => {
  const searchParams = useSearchParams()
  const [currentStep, setCurrentStep] = useState<TAuthsteps>('login')
  const [email, setEmail] = useState<string>('')

  // Ссылка из письма Nest: /login?token=… (redirectUrl задаётся в ForgotPasswordForm).
  // email в ссылке нет — для старых ссылок с ?email= оставляем поддержку.
  // Яндекс OAuth callback (?code&state) больше не обрабатываем — в Nest нет эквивалента.
  useEffect(() => {
    const token = searchParams.get('token')
    const emailParam = searchParams.get('email')
    if (token) {
      setEmail(emailParam || '')
      setCurrentStep('reset')
    } else {
      // после сброса пароля router.push('/login') убирает ?token — выходим из шага reset
      setCurrentStep((step) => (step === 'reset' ? 'login' : step))
    }
  }, [searchParams])

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
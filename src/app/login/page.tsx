'use client'

import ForgotPasswordForm from '@/components/login/ForgotPasswordForm'
import { LoginForm } from '@/components/login/LoginForm'
import RegisterForm from '@/components/login/RegisterForm'
import ResetPasswordForm from '@/components/login/ResetPasswordForm'
import VerifyForm from '@/components/login/VerifyForm'
import { useState } from 'react'

type TAuthsteps = 'login' | 'register' | 'verify' | 'forgot' | 'reset'

const Login = () => {
  const [currentStep, setCurrentStep] = useState<TAuthsteps>('login')
  const [email, setEmail] = useState<string>('')

  const handleSwitchToRegister = () => setCurrentStep('register')
  const handleSwitchToLogin = () => setCurrentStep('login')
  const handleSwitchToForgotPassword = () => setCurrentStep('forgot')
  const handleVerifyEmail = (userEmail: string) => {
    setEmail(userEmail)
    setCurrentStep('verify')
  }
  const handleResetPasswordEmail = (userEmail: string) => {
    setEmail(userEmail)
    setCurrentStep('reset')
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
          />
        )}
        {currentStep === 'forgot' && (
          <ForgotPasswordForm onResetPassword={handleResetPasswordEmail} />
        )}
        {currentStep == 'reset' && <ResetPasswordForm email={email} />}
      </div>
    </main>
  )
}


export default Login
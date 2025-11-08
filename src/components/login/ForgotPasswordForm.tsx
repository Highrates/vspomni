"use client"

import type React from "react"
import { useState } from "react"

interface TProps {
  onResetPassword: (email: string) => void
}

const ForgotPasswordForm = ({ onResetPassword }: TProps) => {
  const [email, setEmail] = useState<string>("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (email) {
      onResetPassword(email)
    }
  }

  return (
    <div className="space-y-8">
      <div className="text-start">
        <h1 className="text-4xl font-bold mb-8">ВСПОМНИ.</h1>
        <h2 className="text-2xl font-semibold mb-4">Забыли пароль</h2>
        <p className="text-gray-600 text-sm leading-relaxed">
          Введите адрес электронной почты, с которым вы зарегистрировались, и мы отправим вам инструкции по сбросу
          пароля.
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
            required
          />
        </div>
        <button
          type="submit"
          className="w-full bg-black text-white rounded-full py-3 text-base font-medium hover:bg-gray-900 transition-colors"
        >
          Выслать инструкцию
        </button>
      </form>
    </div>
  )
}

export default ForgotPasswordForm
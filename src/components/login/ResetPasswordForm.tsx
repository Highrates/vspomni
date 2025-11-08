"use client"

import type React from "react"
import { useState } from "react"

interface TProps {
  email: string
}

const ResetPasswordForm = ({ email }: TProps) => {
  const [newPassword, setNewPassword] = useState<string>("")
  const [confirmPassword, setConfirmPassword] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword === confirmPassword) {
      console.log("pswrd rest: ", { email, newPassword })
    }
  }

  return (
    <div className="space-y-8">
      <div className="text-start">
        <h1 className="text-4xl font-bold mb-8">ВСПОМНИ.</h1>
        <h2 className="text-2xl font-semibold">Придумайте пароль</h2>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4 ">
        <div>
          <label className="block text-sm text-gray-600 mb-1">Новый пароль</label>
          <input
            type="password"
            placeholder="example@mail.com"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full px-4 py-3 bg-gray-100 border-0 rounded"
            required
          />
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">Повторите пароль</label>
          <input
            type="password"
            placeholder="example@mail.com"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full px-4 py-3 bg-gray-100 border-0 rounded"
            required
          />
        </div>
        <button
          type="submit"
					disabled={newPassword !== confirmPassword || !newPassword}
					
          className="w-full bg-black text-white rounded-full py-3 text-base font-medium hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Далее
        </button>
      </form>
    </div>
  )
}

export default ResetPasswordForm
"use client"

import type React from "react"
import { useState } from "react"

interface TProps {
  email: string
  onChangeEmail: () => void
}

const VerifyForm = ({ email, onChangeEmail }: TProps) => {
  const [code, setCode] = useState<string>("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
		console.log("rjk: ", code)
  }
  return (
    <div className="space-y-8">
      <div className="text-start">
        <h1 className="text-4xl font-bold mb-8">ВСПОМНИ.</h1>
        <h2 className="text-2xl font-semibold mb-4">Подтверждение почты</h2>
        <p className="text-black/40 text-sm leading-relaxed">
          Мы отправили 'Одноразовый код доступа' на указанный вами бизнес-адрес электронной почты.
        </p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-gray-600 mb-1">Код</label>
          <input
            type="text"
            placeholder={email}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="w-full px-4 py-3 bg-gray-100 border-0 rounded"
            required
          />
        </div>
        <div className="flex items-center justify-between text-sm">
          <button type="button" className="font-light flex gap-1">
            <p className='text-black/40'>Не пришел код?</p> Отправить еще раз
          </button>
          <span className="text-gray-600 font-medium">2:58</span>
        </div>
        <button
          type="submit"
          className="w-full bg-black text-white rounded-full py-3 text-base font-medium hover:bg-gray-900 transition-colors mt-5"
        >
          Подтвердить
        </button>
        <button
          type="button"
          onClick={onChangeEmail}
          className="w-full text-start text-black/40 text-sm font-medium py-2"
        >
          Сменить Email
        </button>
      </form>
    </div>
  )
}



export default VerifyForm
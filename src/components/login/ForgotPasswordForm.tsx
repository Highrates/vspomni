"use client"

import type React from "react"
import { useState } from "react"
import Image from "next/image"
import { toast } from "react-toastify"
import { useRouter } from "next/navigation"

interface TProps {
  /** Вызывается только если нужно перейти к форме с токеном (обычно не нужно) */
  onResetPassword?: (email: string) => void
  onBack?: () => void
}

const ForgotPasswordForm = ({ onBack }: TProps) => {
  const [email, setEmail] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [sentTo, setSentTo] = useState<string | null>(null)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) {
      toast.error("Введите email")
      return
    }

    setLoading(true)
    try {
      const baseUrl = process.env.NEXT_PUBLIC_SALEOR_API_URL ?? ""
      const resp = await fetch(`${baseUrl}/auth/forgot-password/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      })

      const data = await resp.json().catch(() => ({}))

      if (!resp.ok || !data.ok) {
        const errorMsg = data.error || "Ошибка при отправке письма"
        if (
          typeof errorMsg === "string" &&
          (errorMsg.includes("not found") || errorMsg.includes("не найден"))
        ) {
          throw new Error("Пользователь с таким email не найден")
        }
        throw new Error(errorMsg)
      }

      setSentTo(email.trim())
      toast.success("Если аккаунт существует, инструкции отправлены на почту")
    } catch (error: unknown) {
      console.error("Forgot password error:", error)
      const message =
        error instanceof Error ? error.message : "Ошибка при отправке письма"
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  if (sentTo) {
    return (
      <div className="space-y-8">
        <button
          type="button"
          onClick={() => (onBack ? onBack() : router.push("/login"))}
          className="flex items-center gap-2 mb-4 text-gray-600 hover:text-black transition-colors"
        >
          <img src="/arrow-left-logo.svg" alt="" className="w-5 h-5" />
          <span className="font-medium text-[16px]">вернуться назад</span>
        </button>

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
          <h2 className="text-2xl font-semibold mb-4">Проверьте почту</h2>
          <p className="text-gray-600 text-sm leading-relaxed">
            Мы отправили письмо со ссылкой для сброса пароля на{" "}
            <span className="font-medium text-black">{sentTo}</span>.
            Перейдите по ссылке из письма, чтобы задать новый пароль.
          </p>
          <p className="text-gray-500 text-xs leading-relaxed mt-4">
            Не пришло? Проверьте «Спам» / «Промоакции». Ссылка действует
            ограниченное время.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setSentTo(null)
            setEmail(sentTo)
          }}
          className="w-full border border-black text-black rounded-full py-3 text-base font-medium hover:bg-black/5 transition-colors"
        >
          Отправить ещё раз
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <button
        type="button"
        onClick={() => (onBack ? onBack() : router.back())}
        className="flex items-center gap-2 mb-4 text-gray-600 hover:text-black transition-colors"
      >
        <img src="/arrow-left-logo.svg" alt="" className="w-5 h-5" />
        <span className="font-medium text-[16px]">вернуться назад</span>
      </button>

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
        <h2 className="text-2xl font-semibold mb-4">Забыли пароль</h2>
        <p className="text-gray-600 text-sm leading-relaxed">
          Введите адрес электронной почты, с которым вы зарегистрировались, и
          мы отправим вам инструкции по сбросу пароля.
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
            autoComplete="email"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-black text-white rounded-full py-3 text-base font-medium hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "Отправка..." : "Выслать инструкцию"}
        </button>
      </form>
    </div>
  )
}

export default ForgotPasswordForm

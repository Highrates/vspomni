"use client"

import type React from "react"
import { useState } from "react"
import Image from "next/image"
import { toast } from "react-toastify"
import { useRouter, useSearchParams } from "next/navigation"
import { requestPasswordReset } from "@/api/authApi"
import { nextFromSearchParams } from "@/lib/auth/safeNextPath"

interface TProps {
  /** Вызывается только если нужно перейти к форме с токеном (обычно не нужно) */
  onResetPassword?: (email: string) => void
  onBack?: () => void
}

const SUPPORT_EMAIL = "info@vspomni.store"

const ForgotPasswordForm = ({ onBack }: TProps) => {
  const [email, setEmail] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [mailUnavailable, setMailUnavailable] = useState(false)
  const [devHint, setDevHint] = useState<string | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const nextPath = nextFromSearchParams(searchParams)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) {
      toast.error("Введите email")
      return
    }

    setLoading(true)
    setMailUnavailable(false)
    setDevHint(null)
    try {
      // Nest отвечает 200 всегда (без user enumeration); ссылка в письме → /login?token=…
      // Сохраняем ?next= (например /checkout), чтобы после сброса вернуться к claim.
      const redirectUrl = new URL("/login", window.location.origin)
      if (nextPath !== "/") {
        redirectUrl.searchParams.set("next", nextPath)
      }
      const res = await requestPasswordReset(
        email.trim(),
        redirectUrl.toString(),
      )

      if (res.mailConfigured === false) {
        setMailUnavailable(true)
        if (res.devHint) {
          setDevHint(res.devHint)
          toast.info("SMTP не настроен — ссылка в консоли API / ниже (dev)")
        } else {
          toast.error(
            `Сброс пароля временно недоступен (почта не настроена). Напишите на ${SUPPORT_EMAIL}`,
          )
        }
        setSentTo(email.trim())
        return
      }

      if (res.emailSent) {
        setSentTo(email.trim())
        toast.success("Если аккаунт существует, инструкции отправлены на почту")
        return
      }

      // mailConfigured, но письмо не ушло (нет user / ошибка SMTP) — anti-enum success
      if (res.devHint) {
        setDevHint(res.devHint)
        setSentTo(email.trim())
        toast.info("Письмо не ушло — ссылка для разработки ниже")
        return
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
              style={{ width: 'auto', height: 'auto' }}
            />
          </div>
          {mailUnavailable && !devHint ? (
            <>
              <h2 className="text-2xl font-semibold mb-4">Почта не настроена</h2>
              <p className="text-gray-600 text-sm leading-relaxed">
                Сейчас нельзя выслать ссылку для пароля. Напишите на{" "}
                <a
                  href={`mailto:${SUPPORT_EMAIL}`}
                  className="text-blue-600 font-medium"
                >
                  {SUPPORT_EMAIL}
                </a>{" "}
                — поможем задать доступ (в т.ч. если вы заказывали раньше).
              </p>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-semibold mb-4">Проверьте почту</h2>
              <p className="text-gray-600 text-sm leading-relaxed">
                Мы отправили письмо со ссылкой для сброса пароля на{" "}
                <span className="font-medium text-black">{sentTo}</span>.
                Перейдите по ссылке из письма, чтобы задать новый пароль.
              </p>
              <p className="text-gray-500 text-xs leading-relaxed mt-4">
                Не пришло? Проверьте «Спам» / «Промоакции». Ссылка действует
                ограниченное время. Покупали раньше без пароля на новом сайте —
                это как раз способ его задать.
              </p>
            </>
          )}
          {devHint ? (
            <p className="mt-4 text-xs break-all text-amber-800 bg-amber-50 p-3 rounded">
              Dev-ссылка (SMTP off):{" "}
              <a href={devHint} className="underline text-blue-700">
                {devHint}
              </a>
            </p>
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => {
            setSentTo(null)
            setEmail(sentTo)
            setMailUnavailable(false)
            setDevHint(null)
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
            style={{ width: 'auto', height: 'auto' }}
          />
        </div>
        <h2 className="text-2xl font-semibold mb-4">Забыли пароль</h2>
        <p className="text-gray-600 text-sm leading-relaxed">
          Введите email аккаунта — пришлём ссылку, чтобы задать или сбросить
          пароль. Покупали раньше на сайте? Старый пароль не переносится: задайте
          новый здесь.
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

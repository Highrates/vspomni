'use client'

import Image from 'next/image'
import { useState } from 'react'
import { toast } from 'react-toastify'
import { startYandexOauth } from '@/api/authApi'

export default function YandexIdLoginButton() {
  const [loading, setLoading] = useState(false)

  const handleYandexLogin = async () => {
    if (loading) return
    setLoading(true)
    try {
      const next =
        typeof window !== 'undefined' &&
        window.location.pathname &&
        window.location.pathname !== '/login'
          ? `${window.location.pathname}${window.location.search || ''}`
          : '/'
      const { url } = await startYandexOauth(next)
      window.location.href = url
    } catch (error: unknown) {
      console.error('Yandex auth error:', error)
      const message =
        error instanceof Error
          ? error.message
          : 'Ошибка при авторизации через Яндекс'
      toast.error(message)
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleYandexLogin}
      disabled={loading}
      className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-full font-medium transition-colors duration-200 bg-black text-white hover:bg-gray-900 cursor-pointer disabled:opacity-60 disabled:cursor-wait"
    >
      <Image
        src="/images/Yandex_icon.png"
        alt=""
        width={20}
        height={20}
        className="shrink-0"
        aria-hidden
      />
      <span>{loading ? 'Переход в Яндекс…' : 'Войти через яндекс ID'}</span>
    </button>
  )
}

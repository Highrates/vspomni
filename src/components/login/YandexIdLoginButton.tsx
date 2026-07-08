'use client'

import Image from 'next/image'
import { toast } from 'react-toastify'
import { getYandexAuthUrl } from '@/graphql/queries/auth.service'

export default function YandexIdLoginButton() {
  const handleYandexLogin = async () => {
    try {
      const redirectUri = `${window.location.origin}/login`
      const authUrl = await getYandexAuthUrl(redirectUri)
      sessionStorage.setItem('yandex_auth_return_url', window.location.pathname)
      window.location.href = authUrl
    } catch (error: unknown) {
      console.error('Yandex auth error:', error)
      const message =
        error instanceof Error
          ? error.message
          : 'Ошибка при авторизации через Яндекс'
      toast.error(message)
    }
  }

  return (
    <button
      type="button"
      onClick={handleYandexLogin}
      className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-full font-medium transition-colors duration-200 bg-black text-white hover:bg-gray-900 cursor-pointer"
    >
      <Image
        src="/images/Yandex_icon.png"
        alt=""
        width={20}
        height={20}
        className="shrink-0"
        aria-hidden
      />
      <span>Войти через яндекс ID</span>
    </button>
  )
}

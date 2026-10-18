'use client'

/**
 * Яндекс ID OAuth: в Nest (`/auth/*`) эквивалента нет (Saleor external-auth плагин удалён).
 * Кнопка скрыта, чтобы не ломать вход; вернуть — когда появится Nest OAuth endpoint.
 * Включить принудительно (UI-превью, без рабочего OAuth): NEXT_PUBLIC_YANDEX_ID_LOGIN=1.
 */
import Image from 'next/image'

const ENABLED = process.env.NEXT_PUBLIC_YANDEX_ID_LOGIN === '1'

export default function YandexIdLoginButton() {
  if (!ENABLED) return null

  return (
    <button
      type="button"
      disabled
      title="Вход через Яндекс ID временно недоступен"
      className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-full font-medium bg-black/40 text-white cursor-not-allowed"
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

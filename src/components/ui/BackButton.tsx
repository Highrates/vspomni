'use client'

import { useRouter } from 'next/navigation'
import Image from 'next/image'

export default function BackButton() {
  const router = useRouter()

  const handleBack = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    router.back()
  }

  return (
    <button
      type="button"
      onClick={handleBack}
      className="flex items-center font-semibold cursor-pointer mt-0 mb-0 min-h-[44px] py-2 pr-2 -ml-2 pl-2 touch-manipulation select-none relative z-10 active:opacity-80"
      style={{ WebkitTapHighlightColor: 'transparent' }}
      aria-label="Вернуться назад"
    >
      <Image
        src="/to_right.svg"
        alt=""
        width={20}
        height={20}
        className="mr-1 rotate-180 pointer-events-none"
      />
      <span className="text-left text-md text-black font-medium">
        Вернуться назад
      </span>
    </button>
  )
}

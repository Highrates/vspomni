'use client'

import Link from 'next/link'
import Image from 'next/image'

export default function Footer() {
  return (
    <footer className="flex flex-col container px-5 max-sm:px-2">
      <div className="pt-6 md:pt-10 pb-8 md:pb-13.25">
        <div className="text-left">
          <h1 className="text-2xl md:text-[32px] font-bold mb-4 md:mb-6">
            ВСПОМНИ.
          </h1>
          <div className="flex flex-row gap-2 items-center justify-start">
            <Image
              src="/telegram.svg"
              alt="telegram link"
              width={17}
              height={17}
            />
            <Link
              href="https://t.me/vspomni_zabota"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm md:text-base text-black font-medium"
            >
              Связаться с нами
            </Link>
          </div>
        </div>
      </div>

      {/* Footer Bottom — нижняя часть за чертой */}
      <div className="w-full border-t border-bordergrey py-4 md:py-3.5">
        <div className="flex flex-col md:flex-row items-start justify-start gap-2 md:gap-4">
          <div className="text-left text-xs md:text-sm text-black select-none">
            © 2025 ВСПОМНИ. Все права защищены.
          </div>
          <div className="flex flex-row flex-wrap items-center text-xs md:text-sm gap-2">
            <Link href="/" className="text-textgrey hover:text-black">
              Условия использования
            </Link>
            <span className="text-textgrey select-none">·</span>
            <Link href="/" className="text-textgrey hover:text-black">
              Политика конфиденциальности
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}

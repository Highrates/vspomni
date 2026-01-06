'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useProductGridStore } from '@/stores/useProductGreed'

export default function Footer() {
  const [openAroma2, setOpenAroma2] = useState(false)
  const [openBrand, setOpenBrand] = useState(false)
  const { fetchGridGraphQL, greed } = useProductGridStore()
  useEffect(() => {
    fetchGridGraphQL()
  }, [])
  return (
    <footer className="flex flex-col container px-5 max-sm:px-2">
      <div className="pt-6 md:pt-10 pb-8 md:pb-13.25 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-10">
        {/* Brand Section (no collapse) */}
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
              href="/contacts"
              className="text-sm md:text-base text-black font-medium"
            >
              Связаться с нами
            </Link>
          </div>
        </div>

        {/* Ароматы Column 1 */}
       

        {/* Ароматы Column 2 */}
        <div className="text-center sm:text-left flex flex-col">
          <button
            onClick={() => setOpenAroma2(!openAroma2)}
            className="w-full flex items-center justify-between sm:inline-block sm:text-left"
          >
            <h5 className="text-lg md:text-xl text-black font-semibold">
              Ароматы
            </h5>
            <span
              className="sm:hidden transition-transform"
              style={{
                transform: openAroma2 ? 'rotate(180deg)' : 'rotate(0deg)',
              }}
            >
              ▼
            </span>
          </button>

          <ul
            className={`transition-all overflow-hidden sm:overflow-visible space-y-2
              ${openAroma2 ? 'max-h-[600px] pt-3' : 'max-h-0 sm:max-h-none sm:pt-4'}
            `}
          >
            {greed.map((item, i) => (
              <li key={i} className="mb-2 md:mb-2 text-left">
                <Link
                  href={'/product/' + item.slug}
                  className="text-sm md:text-[15px] text-black/80 hover:underline"
                >
                  {item.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Brand Navigation */}
        <nav className="text-left sm:text-left">
          <button
            onClick={() => setOpenBrand(!openBrand)}
            className="w-full flex items-start justify-between sm:inline-block sm:text-left "
          >
            <h5 className="text-lg md:text-xl text-black font-semibold">
              Брэнд
            </h5>
            <span
              className="sm:hidden transition-transform"
              style={{
                transform: openBrand ? 'rotate(180deg)' : 'rotate(0deg)',
              }}
            >
              ▼
            </span>
          </button>

          <ul
            className={`transition-all overflow-hidden sm:overflow-visible
              ${openBrand ? 'max-h-[600px] pt-3' : 'max-h-0 sm:max-h-none sm:pt-4'}
            `}
          >
            <li className="mb-2 md:mb-4">
              <Link
                href="/catalog"
                className="text-sm md:text-[15px] text-black/80 font-base hover:text-brand border-2 border-white hover:border-black p-2 rounded-full duration-300"
              >
                Каталог
              </Link>
            </li>
            {/* <li className="mb-2 md:mb-4">
              <Link
                href="/#conditions"
                className="text-sm md:text-[15px] text-black/80 font-base hover:text-brand border-2 border-white hover:border-black p-2 rounded-full duration-300"
              >
                Оплата и доставка
              </Link>
            </li> */}
            <li className="mb-2 md:mb-4">
              <Link
                href="/#faq"
                className="text-sm md:text-[15px] text-black/80 font-base hover:text-brand border-2 border-white hover:border-black p-2 rounded-full duration-300"
              >
                FAQ
              </Link>
            </li>
            <li className="mb-2 md:mb-4">
              <Link
                href="/partners"
                className="text-sm md:text-[15px] text-black/80 font-base hover:text-brand border-2 border-white hover:border-black p-2 rounded-full duration-300"
              >
                Стать партнером
              </Link>
            </li>
            <li className="mb-2 md:mb-4">
              <Link
                href="/news"
                className="text-sm md:text-[15px] text-black/80 font-base hover:text-brand border-2 border-white hover:border-black p-2 rounded-full duration-300"
              >
                Блог
              </Link>
            </li>
           
          </ul>
        </nav>
      </div>

      {/* Footer Bottom */}
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

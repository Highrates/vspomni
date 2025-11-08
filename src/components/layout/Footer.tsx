"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";

export default function Footer() {
  const [openAroma1, setOpenAroma1] = useState(false);
  const [openAroma2, setOpenAroma2] = useState(false);
  const [openBrand, setOpenBrand] = useState(false);

  return (
    <footer className="flex flex-col min-w-full px-4 sm:px-6 md:px-8">
      <div className="pt-6 md:pt-10 pb-8 md:pb-13.25 grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4  gap-6 md:gap-5">

        {/* Brand Section (no collapse) */}
        <div className="text-left">
          <h1 className="text-2xl md:text-[32px] font-bold mb-4 md:mb-6">ВСПОМНИ.</h1>
          <div className="flex flex-row gap-2 items-center justify-start">
            <Image src="/telegram.svg" alt="telegram link" width={17} height={17} />
            <Link href="/contacts" className="text-sm md:text-base text-black font-medium">
              Связаться с нами
            </Link>
          </div>
        </div>

        {/* Ароматы Column 1 */}
        <div className="text-center sm:text-left">
          <button
            onClick={() => setOpenAroma1(!openAroma1)}
            className="w-full flex items-center justify-between sm:inline-block sm:text-left"
          >
            <h5 className="text-lg md:text-xl text-black font-semibold ">Ароматы</h5>
            <span className="sm:hidden transition-transform"
              style={{ transform: openAroma1 ? "rotate(180deg)" : "rotate(0deg)" }}>
              ▼
            </span>
          </button>

          <ul
            className={`transition-all overflow-hidden sm:overflow-visible
              ${openAroma1 ? "max-h-[600px] pt-3" : "max-h-0 sm:max-h-none sm:pt-4"}
            `}
          >
            {Array(8).fill(0).map((_, i) => (
              <li key={i} className="mb-2 md:mb-4">
                <Link href="/aroma" className="text-sm md:text-[15px] text-black/80 font-base border-2 border-white hover:border-black p-2 rounded-full duration-300">
                  Аромат
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Ароматы Column 2 */}
        <div className="text-center sm:text-left flex flex-col">
          <button
            onClick={() => setOpenAroma2(!openAroma2)}
            className="w-full flex items-center justify-between sm:inline-block sm:text-left"
          >
            <h5 className="text-lg md:text-xl text-black font-semibold">Ароматы</h5>
            <span className="sm:hidden transition-transform"
              style={{ transform: openAroma2 ? "rotate(180deg)" : "rotate(0deg)" }}>
              ▼
            </span>
          </button>

          <ul
            className={`transition-all overflow-hidden sm:overflow-visible space-y-2
              ${openAroma2 ? "max-h-[600px] pt-3" : "max-h-0 sm:max-h-none sm:pt-4"}
            `}
          >
            {Array(5).fill(0).map((_, i) => (
              <li key={i} className="mb-2 md:mb-4">
                <Link href="/aroma" className="text-sm md:text-[15px] text-black/80 font-base hover:text-black border-2 border-white hover:border-black p-2 rounded-full duration-300">
                  Аромат
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Brand Navigation */}
        <nav className="text-center sm:text-left">
          <button
            onClick={() => setOpenBrand(!openBrand)}
            className="w-full flex items-start justify-between sm:inline-block sm:text-left"
          >
            <h5 className="text-lg md:text-xl text-black font-semibold">Брэнд</h5>
            <span className="sm:hidden transition-transform"
              style={{ transform: openBrand ? "rotate(180deg)" : "rotate(0deg)" }}>
              ▼
            </span>
          </button>

          <ul
            className={`transition-all overflow-hidden sm:overflow-visible
              ${openBrand ? "max-h-[600px] pt-3" : "max-h-0 sm:max-h-none sm:pt-4"}
            `}
          >
            <li className="mb-2 md:mb-4"><Link href="/catalog" className="text-sm md:text-[15px] text-black/80 font-base hover:text-brand border-2 border-white hover:border-black p-2 rounded-full duration-300">Каталог</Link></li>
            <li className="mb-2 md:mb-4"><Link href="/conditions" className="text-sm md:text-[15px] text-black/80 font-base hover:text-brand border-2 border-white hover:border-black p-2 rounded-full duration-300">Оплата и доставка</Link></li>
            <li className="mb-2 md:mb-4"><Link href="/faq" className="text-sm md:text-[15px] text-black/80 font-base hover:text-brand border-2 border-white hover:border-black p-2 rounded-full duration-300">FAQ</Link></li>
            <li className="mb-2 md:mb-4"><Link href="/partnership" className="text-sm md:text-[15px] text-black/80 font-base hover:text-brand border-2 border-white hover:border-black p-2 rounded-full duration-300">Стать партнером</Link></li>
            <li className="mb-2 md:mb-4"><Link href="/blog" className="text-sm md:text-[15px] text-black/80 font-base hover:text-brand border-2 border-white hover:border-black p-2 rounded-full duration-300">Блог</Link></li>
            <li><Link href="/howorder" className="text-sm md:text-[15px] text-black/80 font-base hover:text-brand border-2 border-white hover:border-black p-2 rounded-full duration-300">Как выглядит заказ</Link></li>
          </ul> 
        </nav>

      </div>

      {/* Footer Bottom */}
      <div className="min-w-full border-t border-bordergrey py-4 md:py-3.5">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3 md:gap-0">
          <div className="text-center md:text-left text-xs md:text-sm text-black select-none">
            © 2025 ВСПОМНИ. Все права защищены.
          </div>
          <div className="flex items-center text-xs md:text-sm text-center gap-2">
            <Link href="/" className="text-textgrey hover:text-black">Условия использования</Link>
            <p className="text-textgrey select-none">·</p>
            <Link href="/" className="text-textgrey hover:text-black">Политика конфиденциальности</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
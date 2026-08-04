import Image from 'next/image'
import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'

export default function HistoryLine() {
  return (
    <section className="relative w-full overflow-hidden px-2 mt-4 sm:mt-6 md:mt-8 lg:mt-10 mb-4 sm:mb-6 md:mb-8 lg:mb-10">
      <Link
        href="https://t.me/vspomni_nice"
        target="_blank"
        rel="noopener noreferrer"
        className="block relative w-full h-full cursor-pointer"
      >
        {/* Контент по центру — как в «Подарочные пакеты» / наши сосочки */}
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
          <div className="flex items-center justify-center gap-4 sm:gap-5 md:gap-6">
            <Image
              src="/telegram.svg"
              alt="telegram link"
              width={49}
              height={49}
              className="w-[32px] h-[32px] sm:w-[40px] sm:h-[40px] md:w-[49px] md:h-[49px] flex-shrink-0"
            />
            <h6 className="text-[16px] sm:text-[28px] md:text-[32px] lg:text-[48px] font-semibold select-none text-white leading-[1.2] lg:leading-[52px]">
              История создания бренда с первого дня
            </h6>
            <div className="hidden sm:flex w-[40px] h-[40px] md:w-[49px] md:h-[49px] rounded-full bg-white/50 backdrop-blur-[10px] items-center justify-center flex-shrink-0">
              <ArrowUpRight className="w-[16px] h-[16px] md:w-[20px] md:h-[20px] text-black" strokeWidth={1.5} />
            </div>
          </div>
        </div>

        {/* Фоновое изображение — те же размеры и скругление, что у блока «подарочные пакеты» */}
        <div className="relative w-full h-[170px] sm:h-[240px] md:h-[300px] lg:h-[340px] overflow-hidden rounded-[16px]">
          <Image
            src="/images/history-vspomni.png"
            alt="История создания ВСПОМНИ — Максим Кусков, Иван Городилов"
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 768px) 95vw, (max-width: 1600px) 98vw, 1536px"
            className="rounded-[16px] object-cover object-[center_35%]"
          />
          <div className="absolute inset-0 bg-black/25 rounded-[16px]" />
        </div>
      </Link>
    </section>
  )
}

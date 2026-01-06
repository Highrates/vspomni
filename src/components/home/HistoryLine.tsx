import Image from 'next/image'
import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'

export default function HistoryLine() {
  return (
    <section className="relative w-full overflow-hidden px-2 mt-8 sm:mt-12 md:mt-20 lg:mt-[180px] mb-8 sm:mb-12 md:mb-20 lg:mb-[180px]">
      {/* Контент по центру */}
      <div className="absolute inset-0 flex items-center justify-center z-10">
        <Link 
          href="https://t.me/vspomni_nice" 
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-4 sm:gap-5 md:gap-6"
        >
          {/* Иконка телеграма */}
          <Image
            src="/telegram.svg"
            alt="telegram link"
            width={49}
            height={49}
            className="w-[32px] h-[32px] sm:w-[40px] sm:h-[40px] md:w-[49px] md:h-[49px] flex-shrink-0"
          />

          {/* Текст */}
          <h6 className="text-[16px]  sm:text-[28px] md:text-[32px] lg:text-[48px] font-semibold select-none text-white leading-[1.2] lg:leading-[58px]">
            История создания бренда с 1 дня
          </h6>

          {/* Кнопка со стрелкой (скрыта на мобилке) */}
          <div className="hidden sm:flex w-[40px] h-[40px] md:w-[49px] md:h-[49px] rounded-full bg-white/50 backdrop-blur-[10px] items-center justify-center flex-shrink-0">
            <ArrowUpRight className="w-[16px] h-[16px] md:w-[20px] md:h-[20px] text-black" strokeWidth={1.5} />
          </div>
        </Link>
      </div>

      {/* Фоновое изображение */}
      <div className="relative w-full h-[200px] sm:h-[280px] md:h-[340px] lg:h-[384px] overflow-hidden rounded-[16px]">
        <Image
          src="/images/history-back.png"
          alt="back image"
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 768px) 95vw, (max-width: 1600px) 98vw, 1536px"
          className="rounded-[16px] object-cover"
        />
      </div>
    </section>
  )
}
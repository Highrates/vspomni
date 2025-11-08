import Image from 'next/image'
import Link from 'next/link'

export default function HistoryLine() {
  return (
    <section className="relative w-full overflow-hidden mt-12 sm:mt-20 md:mt-32 lg:mt-45 mb-12 sm:mb-20 md:mb-32 lg:mb-45 px-4 sm:px-6 md:px-8">
      <div className="absolute inset-0 flex items-center justify-center px-4 sm:px-6 md:px-8 lg:px-12 z-10">
        <Link 
          href="/#" 
          className="flex items-center justify-center gap-3 sm:gap-4 md:gap-6 w-full max-w-6xl px-2"
        >
          <Image
            src="/telegram.svg"
            alt="telegram link"
            width={49}
            height={49}
            className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 lg:w-[49px] lg:h-[49px] flex-shrink-0"
          />
          <h6 className="text-[20px] sm:text-[28px] md:text-[36px] lg:text-[42px] xl:text-[48px] font-semibold select-none text-white text-center leading-tight flex-1 min-w-0">
            История создания бренда с 1 дня
          </h6>
          <Image
            src="/history.svg"
            alt="all news link"
            width={49}
            height={49}
            className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 lg:w-[49px] lg:h-[49px] flex-shrink-0"
          />
        </Link>
      </div>
      <div className="relative w-full h-64 sm:h-80 md:h-96 overflow-hidden bg-red rounded-xl sm:rounded-2xl">
        <Image
          src="/images/history-back.png"
          alt="back image"
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 768px) 95vw, (max-width: 1600px) 98vw, 1536px"
          className="rounded-xl sm:rounded-2xl object-cover"
        />
      </div>
    </section>
  )
}
import Image from 'next/image'
import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'

export default function HistoryLine() {
  return (
    <section className="relative mt-4 mb-4 w-full px-0 sm:mt-6 sm:mb-6 md:mt-8 md:mb-8 lg:mt-10 lg:mb-10">
      <Link
        href="https://t.me/vspomni_nice"
        target="_blank"
        rel="noopener noreferrer"
        className="relative block w-full cursor-pointer"
      >
        <div className="relative h-[170px] w-full overflow-hidden rounded-[16px] sm:h-[240px] md:h-[300px] lg:h-[340px]">
          <Image
            src="/images/history-vspomni.png"
            alt="История создания ВСПОМНИ — Максим Кусков, Иван Городилов"
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 768px) 95vw, (max-width: 1600px) 98vw, 1536px"
            className="rounded-[16px] object-cover object-[center_35%]"
            priority={false}
          />
          <div className="absolute inset-0 z-[1] rounded-[16px] bg-black/45" />

          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center px-4 sm:px-8 md:px-10">
            <div className="flex max-w-full items-center justify-center gap-2 sm:gap-4 md:gap-5">
              <Image
                src="/telegram.svg"
                alt=""
                width={49}
                height={49}
                className="h-7 w-7 shrink-0 sm:h-10 sm:w-10 md:h-[49px] md:w-[49px]"
              />
              <h6 className="min-w-0 max-w-[18rem] text-center text-[14px] font-semibold leading-[1.25] text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.75)] select-none sm:max-w-[28rem] sm:text-[26px] md:max-w-[36rem] md:text-[32px] lg:max-w-[42rem] lg:text-[40px] lg:leading-[1.15]">
                История создания бренда
                <br className="sm:hidden" />
                <span className="hidden sm:inline"> </span>
                с первого дня
              </h6>
              <div className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/50 backdrop-blur-[10px] sm:flex md:h-[49px] md:w-[49px]">
                <ArrowUpRight
                  className="h-4 w-4 text-black md:h-5 md:w-5"
                  strokeWidth={1.5}
                />
              </div>
            </div>
          </div>
        </div>
      </Link>
    </section>
  )
}

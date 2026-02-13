'use client'

import Image from 'next/image'

const DEFAULT_IMAGE = '/images/hero-left-1.jpg'
const DEFAULT_TEXT = 'Скоро свечи'

export interface CandlesSoonBannerProps {
  /** URL картинки из модели (атрибут типа «Картинка 1») */
  imageUrl?: string | null
  /** Текст баннера из модели (атрибут «Скоро свечи банер» или заголовок страницы) */
  bannerText?: string | null
}

export default function CandlesSoonBanner({ imageUrl, bannerText }: CandlesSoonBannerProps) {
  const src = imageUrl && imageUrl.startsWith('http') ? imageUrl : DEFAULT_IMAGE
  const text = (bannerText || DEFAULT_TEXT).trim()

  return (
    <section className="relative w-full overflow-hidden px-2 mt-4 sm:mt-6 md:mt-8 lg:mt-10 mb-4 sm:mb-6 md:mb-8 lg:mb-10">
      <div className="relative w-full h-[170px] sm:h-[240px] md:h-[300px] lg:h-[340px] overflow-hidden rounded-[16px]">
        <Image
          src={src}
          alt={text}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 768px) 95vw, (max-width: 1600px) 98vw, 1536px"
          className="rounded-[16px] object-cover"
        />
        <div className="absolute inset-0 bg-black/35 rounded-[16px]" />

        <div className="absolute inset-0 flex items-center justify-center z-10">
          <h6 className="text-[20px] sm:text-[28px] md:text-[32px] lg:text-[48px] font-semibold select-none text-white leading-[1.2] lg:leading-[52px] text-center">
            {text}
          </h6>
        </div>
      </div>
    </section>
  )
}


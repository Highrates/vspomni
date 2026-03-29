'use client'

import { Swiper, SwiperSlide } from 'swiper/react'
import { Pagination } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/pagination'
import 'swiper/css/navigation'
import 'swiper/css/effect-fade'

import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  getSlider,
  getMobileSlider,
  getHeroBottomBanners,
  SliderItem,
  type HeroBottomBanner,
} from '@/graphql/queries/slider.service'
import { useMobile } from '@/lib/hooks'

interface HeroSlide {
  id: string
  image: string
  logoText: string
  badgeImage: string
  title: string
  text: string
  /** С плашки: атрибут ssylka-na-tovar и т.п. */
  href?: string
}

/** Блок внизу слайдера (плашка): всегда этот контент — один источник для десктопа и мобилки */
const defaultSlides: HeroSlide[] = [
  {
    id: 'default-1',
    image: '/images/hero-left-1.jpg',
    logoText: 'ВСПОМНИ',
    badgeImage: '/images/hero-badge.png',
    title: 'Аромат, что остаётся. История, что звучит в памяти',
    text: 'Каждый аромат — это история, сотканная из чувств, мгновений и памяти.',
  },
  {
    id: 'default-2',
    image: '/images/hero-left-1.jpg',
    logoText: 'ВСПОМНИ',
    badgeImage: '/images/hero-badge.png',
    title: 'ВСПОМНИ ТО, ЧТО ДОРОГО',
    text: 'Почувствуй эмоции, которые возвращают тебя в самые тёплые моменты жизни.',
  },
]

/** Картинки слайдера из API; блок внизу — из bottomBanners по индексу (1→банер 1, 2→банер 2), иначе defaultSlides */
function apiSlidesToHero(
  apiSlides: SliderItem[],
  bottomBanners: HeroBottomBanner[] = []
): HeroSlide[] {
  if (apiSlides.length === 0) return []
  return apiSlides.map((slide, i) => {
    const def = defaultSlides[i % defaultSlides.length]
    const banner = bottomBanners[i]
    const href = banner?.href?.trim()
    return {
      id: slide.id,
      image: slide.image || def.image,
      logoText: def.logoText,
      badgeImage: banner?.image || def.badgeImage,
      title: (banner?.title && banner.title.trim()) ? banner.title : def.title,
      text: (banner?.description && banner.description.trim()) ? banner.description : def.text,
      ...(href ? { href } : {}),
    }
  })
}

const SWIPER_CLASS = 'hero-swiper w-full h-[70vh] sm:h-[80vh] md:h-[85vh] lg:h-[90vh]'

function HeroBottomBadge({ slide }: { slide: HeroSlide }) {
  const href = slide.href?.trim()
  const motionClass =
    'absolute left-3 right-3 md:left-6 md:right-6 bottom-4 md:bottom-8 flex flex-row gap-4 md:gap-5 bg-white/30 backdrop-blur-md rounded-4xl p-3 md:p-2.5 shadow-[0_4px_20px_rgba(0,0,0,0.08)]'
  const inner = (
    <motion.div
      key={slide.id + '-badge'}
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
      className={`${motionClass}${href ? ' cursor-pointer' : ''}`}
    >
      <motion.div
        key={slide.id + '-img'}
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="w-[70px] h-[70px] sm:w-[100px] sm:h-[100px] md:w-[122px] md:h-[122px] rounded-xl overflow-hidden shrink-0"
      >
        <img
          src={slide.badgeImage}
          alt=""
          className="w-full h-full object-cover rounded-xl"
        />
      </motion.div>
      <motion.div
        key={slide.id + '-text'}
        initial={{ opacity: 0, x: 15 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.35 }}
        className="flex flex-col justify-center text-black text-left flex-1 min-w-0"
      >
        <h2 className="text-[11px] sm:text-[16px] md:text-[20px] font-semibold mb-0.5 sm:mb-2 leading-tight">
          {slide.title.split('.')[0]}
          {slide.title.split('.')[1] ? (
            <>
              <br className="hidden sm:block" />
              <span className="sm:hidden">, </span>
              {slide.title.split('.')[1]}
            </>
          ) : null}
        </h2>
        <p className="text-[9px] sm:text-[13px] md:text-[15px] text-black/80 leading-snug line-clamp-3">
          {slide.text}
        </p>
      </motion.div>
    </motion.div>
  )

  if (!href) return inner

  if (/^https?:\/\//i.test(href)) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="contents cursor-pointer"
        aria-label={`${slide.title}: перейти`}
      >
        {inner}
      </a>
    )
  }

  return (
    <Link
      href={href}
      className="contents cursor-pointer"
      aria-label={`${slide.title}: перейти`}
    >
      {inner}
    </Link>
  )
}

function HeroSwiper({
  slides,
  paginationEnabled,
  className,
  imagePosition = 'center',
}: {
  slides: HeroSlide[]
  paginationEnabled: boolean
  className: string
  /** На мобилке лучше "top" — верх картинки всегда виден */
  imagePosition?: 'center' | 'top'
}) {
  const fallbackImg = defaultSlides[0].image
  const imgClass =
    imagePosition === 'top'
      ? 'absolute inset-0 w-full h-full object-cover object-top'
      : 'object-cover w-full h-full'
  return (
    <Swiper
      modules={[Pagination]}
      pagination={{
        clickable: true,
        dynamicBullets: true,
        enabled: paginationEnabled,
      }}
      spaceBetween={0}
      slidesPerView={1}
      grabCursor
      allowTouchMove
      simulateTouch={true}
      threshold={5}
      touchRatio={1}
      preventClicks={false}
      preventClicksPropagation={false}
      className={className}
    >
      {slides.map((slide) => (
        <SwiperSlide key={slide.id}>
          <div className="relative w-full h-full min-h-full overflow-hidden rounded-[12px] sm:rounded-md md:rounded-[20px] lg:rounded-lg">
            <img
              src={slide.image || fallbackImg}
              alt={slide.title}
              className={imgClass}
              style={imagePosition === 'top' ? { objectPosition: 'top' } : undefined}
            />
            {/* Блок внизу — всегда из defaultSlides (badgeImage, title, text) */}
            <div className="absolute inset-0 flex">
              <div className="relative lg:flex-1 w-full h-full items-center">
                <HeroBottomBadge slide={slide} />
              </div>
              <div className="flex-1"></div>
            </div>
          </div>
        </SwiperSlide>
      ))}
    </Swiper>
  )
}

export default function Hero() {
  const isMobile = useMobile()
  const [desktopSlides, setDesktopSlides] = useState<HeroSlide[]>([])
  const [mobileSlides, setMobileSlides] = useState<HeroSlide[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const [desktop, mobile, bottomBanners] = await Promise.all([
          getSlider(),
          getMobileSlider(),
          getHeroBottomBanners(),
        ])
        if (cancelled) return
        const desktopHero = apiSlidesToHero(desktop, bottomBanners)
        const mobileHero = apiSlidesToHero(mobile, bottomBanners)
        setDesktopSlides(desktopHero.length > 0 ? desktopHero : defaultSlides)
        setMobileSlides(mobileHero.length > 0 ? mobileHero : defaultSlides)
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to fetch slider:', error)
          setDesktopSlides(defaultSlides)
          setMobileSlides(defaultSlides)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const desktop = desktopSlides.length > 0 ? desktopSlides : defaultSlides
  const mobile = mobileSlides.length > 0 ? mobileSlides : defaultSlides

  if (loading) {
    return (
      <section className="relative w-full overflow-hidden px-2">
        <div
          className="w-full h-[70vh] sm:h-[80vh] md:h-[85vh] lg:h-[90vh] rounded-[12px] sm:rounded-md md:rounded-[20px] lg:rounded-lg bg-gray-200 animate-pulse"
          aria-hidden
        />
      </section>
    )
  }

  return (
    <section className="relative w-full overflow-hidden px-2">
      {/* Десктоп: картинки из getSlider(), блок внизу — defaultSlides */}
      <div className="hidden md:block">
        <HeroSwiper slides={desktop} paginationEnabled={false} className={SWIPER_CLASS} />
      </div>
      {/* Мобилка: картинки из getMobileSlider(), верх картинки всегда виден */}
      <div className="block md:hidden">
        <HeroSwiper
          slides={mobile}
          paginationEnabled={isMobile}
          className={SWIPER_CLASS}
          imagePosition="top"
        />
      </div>
    </section>
  )
}

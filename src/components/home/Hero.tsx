'use client'

import { Swiper, SwiperSlide } from 'swiper/react'
import { Pagination } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/pagination'
import 'swiper/css/navigation'
import 'swiper/css/effect-fade'

import { motion } from 'framer-motion'
import { useEffect, useState, type ReactNode } from 'react'
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
  /** Ссылка нижней плашки */
  href?: string
  /** Ссылка большого баннера (картинка слайда) */
  slideHref?: string
}

/** Ссылка по клику на нижнюю плашку Hero («Попробуй новинку?» и т.п.) */
const HERO_BOTTOM_BADGE_LINK = '/catalog/aroma/teplichka-u-babuli'

/** Блок внизу слайдера (плашка): всегда этот контент — один источник для десктопа и мобилки */
const defaultSlides: HeroSlide[] = [
  {
    id: 'default-1',
    image: '/images/hero-left-1.jpg',
    logoText: 'ВСПОМНИ',
    badgeImage: '/images/hero-badge.png',
    title: 'Аромат, что остаётся. История, что звучит в памяти',
    text: 'Каждый аромат — это история, сотканная из чувств, мгновений и памяти.',
    href: HERO_BOTTOM_BADGE_LINK,
    slideHref: '/catalog',
  },
  {
    id: 'default-2',
    image: '/images/hero-left-1.jpg',
    logoText: 'ВСПОМНИ',
    badgeImage: '/images/hero-badge.png',
    title: 'ВСПОМНИ ТО, ЧТО ДОРОГО',
    text: 'Почувствуй эмоции, которые возвращают тебя в самые тёплые моменты жизни.',
    href: HERO_BOTTOM_BADGE_LINK,
    slideHref: '/catalog',
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
    // Одна доп. плашка из админки — на все слайды; иначе fallback defaultSlides
    const banner = bottomBanners[i] ?? bottomBanners[0]
    const badgeHref = banner?.href?.trim() || HERO_BOTTOM_BADGE_LINK
    // Ссылка большого баннера — своя; fallback на /catalog
    const slideHref = slide.href?.trim() || '/catalog'
    return {
      id: slide.id,
      image: slide.image || def.image,
      logoText: def.logoText,
      badgeImage: banner?.image || def.badgeImage,
      title: (banner?.title && banner.title.trim()) ? banner.title : def.title,
      text: (banner?.description && banner.description.trim()) ? banner.description : def.text,
      href: badgeHref,
      slideHref,
    }
  })
}

const SWIPER_CLASS = 'hero-swiper w-full h-[70vh] sm:h-[80vh] md:h-[85vh] lg:h-[90vh]'

function HeroBottomBadge({ slide }: { slide: HeroSlide }) {
  const href = slide.href?.trim() || HERO_BOTTOM_BADGE_LINK
  // На всю ширину слайда (left+right), плотная подложка — без inset-x Tailwind
  // (на части сборок absolute+flex съезжал вправо)
  const shellClass =
    'pointer-events-auto absolute z-20 flex max-h-[40%] cursor-pointer flex-row items-center gap-3 overflow-hidden rounded-[12px] p-2 shadow-[0_8px_28px_rgba(0,0,0,0.18)] sm:max-h-none sm:gap-4 sm:rounded-2xl sm:p-2.5 md:gap-5 md:rounded-[20px]'
  const shellStyle = {
    left: 12,
    right: 12,
    bottom: 12,
    width: 'auto',
    boxSizing: 'border-box' as const,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
  }

  const inner = (
    <motion.div
      key={slide.id + '-badge'}
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
      className="flex min-w-0 flex-1 flex-row items-center gap-3 sm:gap-4 md:gap-5"
    >
      <motion.div
        key={slide.id + '-img'}
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="h-16 w-16 shrink-0 overflow-hidden rounded-[10px] sm:h-[100px] sm:w-[100px] sm:rounded-[12px] md:h-[122px] md:w-[122px] md:rounded-[14px]"
      >
        <img
          src={slide.badgeImage}
          alt=""
          className="h-full w-full rounded-[10px] object-cover sm:rounded-[12px] md:rounded-[14px]"
        />
      </motion.div>
      <motion.div
        key={slide.id + '-text'}
        initial={{ opacity: 0, x: 15 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.35 }}
        className="flex min-w-0 flex-1 flex-col justify-center overflow-hidden text-left text-black"
      >
        <p className="mb-0.5 line-clamp-2 text-[13px] leading-tight font-semibold sm:mb-2 sm:line-clamp-none sm:text-[16px] md:text-[20px]">
          {slide.title.split('.')[0]}
          {slide.title.split('.')[1] ? (
            <>
              <br className="hidden sm:block" />
              <span className="sm:hidden">, </span>
              {slide.title.split('.')[1]}
            </>
          ) : null}
        </p>
        <p className="line-clamp-2 text-[12px] leading-snug text-black/80 sm:line-clamp-3 sm:text-[13px] md:text-[15px]">
          {slide.text}
        </p>
      </motion.div>
    </motion.div>
  )

  if (/^https?:\/\//i.test(href)) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={shellClass}
        style={shellStyle}
        aria-label={`${slide.title}: перейти`}
      >
        {inner}
      </a>
    )
  }

  return (
    <Link
      href={href}
      className={shellClass}
      style={shellStyle}
      aria-label={`${slide.title}: перейти`}
    >
      {inner}
    </Link>
  )
}

function HeroSlideLink({
  href,
  className,
  ariaLabel,
  children,
}: {
  href: string
  className?: string
  ariaLabel: string
  children: ReactNode
}) {
  if (/^https?:\/\//i.test(href)) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
        aria-label={ariaLabel}
      >
        {children}
      </a>
    )
  }
  return (
    <Link href={href} className={className} aria-label={ariaLabel}>
      {children}
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
  // Всегда absolute fill — иначе при h-full у img высота слайда может схлопнуться в 0
  const imgClass =
    imagePosition === 'top'
      ? 'absolute inset-0 h-full w-full object-cover object-top'
      : 'absolute inset-0 h-full w-full object-cover object-center'
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
      {slides.map((slide) => {
        const slideHref = slide.slideHref?.trim()
        const imageEl = (
          <img
            src={slide.image || fallbackImg}
            alt={slide.title}
            className={imgClass}
            style={imagePosition === 'top' ? { objectPosition: 'top' } : undefined}
          />
        )
        return (
          <SwiperSlide key={slide.id}>
            <div className="relative h-full min-h-full w-full overflow-hidden rounded-[12px] sm:rounded-2xl md:rounded-[20px]">
              {slideHref ? (
                <HeroSlideLink
                  href={slideHref}
                  className="absolute inset-0 z-0 block cursor-pointer"
                  ariaLabel={`${slide.title}: перейти`}
                >
                  {imageEl}
                </HeroSlideLink>
              ) : (
                imageEl
              )}
              {/* Плашка напрямую на слайде — иначе подложка/blur «съедаются» inset-обёрткой */}
              <HeroBottomBadge slide={slide} />
            </div>
          </SwiperSlide>
        )
      })}
    </Swiper>
  )
}

/** Гарантированно same-origin путь (телефон по LAN не ходит на 127.0.0.1) */
function ensureSameOriginSrc(url: string): string {
  const s = (url || '').trim()
  if (!s) return ''
  if (s.startsWith('/') && !s.startsWith('//')) return s
  try {
    const u = new URL(s)
    if (
      u.pathname.startsWith('/uploads') ||
      u.pathname.startsWith('/images/') ||
      u.pathname.startsWith('/logo/')
    ) {
      return `${u.pathname}${u.search}`
    }
  } catch {
    /* ignore */
  }
  return s
}

function normalizeHeroSlides(slides: HeroSlide[]): HeroSlide[] {
  return slides.map((s) => ({
    ...s,
    image: ensureSameOriginSrc(s.image) || s.image,
    badgeImage: ensureSameOriginSrc(s.badgeImage) || s.badgeImage,
  }))
}

export default function Hero() {
  // md = 768 — как Tailwind `md:`, не путать с useMobile(640)
  const isMdUp = !useMobile(768)
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
        const desktopHero = normalizeHeroSlides(
          apiSlidesToHero(desktop, bottomBanners),
        )
        const mobileHero = normalizeHeroSlides(
          apiSlidesToHero(mobile, bottomBanners),
        )
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
  // Один swiper: два hidden-swiper ломали высоту/картинки на телефоне
  const slides = isMdUp ? desktop : mobile

  if (loading) {
    return (
      <section className="relative w-full overflow-hidden px-2">
        <div
          className="h-[70vh] w-full animate-pulse rounded-[12px] bg-gray-200 sm:h-[80vh] sm:rounded-2xl md:h-[85vh] md:rounded-[20px] lg:h-[90vh]"
          aria-hidden
        />
      </section>
    )
  }

  return (
    <section className="relative w-full overflow-hidden px-2">
      <HeroSwiper
        key={isMdUp ? 'desktop' : 'mobile'}
        slides={slides}
        paginationEnabled={!isMdUp}
        className={SWIPER_CLASS}
        imagePosition="center"
      />
    </section>
  )
}

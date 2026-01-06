'use client'

import { Swiper, SwiperSlide } from 'swiper/react'
import { Autoplay, Pagination, Navigation, EffectFade } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/pagination'
import 'swiper/css/navigation'
import 'swiper/css/effect-fade'

import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { getSlider, SliderItem } from '@/graphql/queries/slider.service'

interface HeroSlide {
  id: string
  image: string
  logoText: string
  badgeImage: string
  title: string
  text: string
}

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

export default function Hero() {
  const [activeIndex, setActiveIndex] = useState(0)
  const [slides, setSlides] = useState<HeroSlide[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchSlider = async () => {
      try {
        const data = await getSlider()
        if (data.length > 0) {
          const heroSlides: HeroSlide[] = data.map((slide, index) => {
            const defaultSlide = defaultSlides[index % defaultSlides.length]
            return {
              id: slide.id,
              image: slide.image || defaultSlide.image,
              logoText: defaultSlide.logoText,
              badgeImage: defaultSlide.badgeImage,
              title: defaultSlide.title,
              text: defaultSlide.text,
            }
          })
          setSlides(heroSlides)
        } else {
          setSlides(defaultSlides)
        }
      } catch (error) {
        console.error('Failed to fetch slider:', error)
        setSlides(defaultSlides)
      } finally {
        setLoading(false)
      }
    }
    fetchSlider()
  }, [])

  if (loading) {
    return null
  }

  if (slides.length === 0) {
    return null
  }

  return (
    <section className="relative w-full overflow-hidden px-2">
      <Swiper
        modules={[Autoplay, Pagination, Navigation, EffectFade]}
        autoplay={{ delay: 6000, disableOnInteraction: false }}
        pagination={{ clickable: true }}
        navigation
        loop
        effect="fade"
        speed={900}
        onSlideChange={(swiper) => setActiveIndex(swiper.realIndex)}
        className="w-full h-[70vh]  sm:h-[80vh] md:h-[85vh] lg:h-[90vh] [&_.swiper-button-prev]:hidden [&_.swiper-button-next]:hidden sm:[&_.swiper-button-prev]:flex sm:[&_.swiper-button-next]:flex"
      >
        {slides.map((slide, index) => (
          <SwiperSlide key={slide.id}>
            <div className="relative w-full h-full overflow-hidden rounded-[12px] sm:rounded-md md:rounded-[20px] lg:rounded-lg">
              {/* Единая цельная картинка на весь слайд */}
              <img
                src={slide.image}
                alt={slide.title || 'Slider'}
                className="object-cover w-full h-full"
              />

              {/* Контент только на левой половине */}
              <div className="absolute inset-0 flex">
                <div className="relative lg:flex-1 w-full h-full items-center">
                  {/* ТЕКСТОВАЯ ПЛАШКА */}
                  <motion.div
                    key={activeIndex + '-badge'}
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
                    className="absolute left-3 right-3 md:left-6 md:right-6 bottom-4 md:bottom-8 hidden sm:flex flex-row gap-3 md:gap-5 bg-white/30 backdrop-blur-md rounded-4xl p-3 md:p-2.5 shadow-[0_4px_20px_rgba(0,0,0,0.08)]"
                  >
                    {/* Левая мини-картинка - квадратная */}
                    <motion.div
                      key={activeIndex + '-img'}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.5, delay: 0.3 }}
                      className="w-[70px] h-[70px] sm:w-[100px] sm:h-[100px] md:w-[122px] md:h-[122px] rounded-xl overflow-hidden shrink-0"
                    >
                      <img
                        src={slide.badgeImage}
                        alt="badge"
                        className="w-full h-full object-cover rounded-xl"
                      />
                    </motion.div>

                    {/* Текст справа */}
                    <motion.div
                      key={activeIndex + '-text'}
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
                </div>
                <div className="flex-1"></div>
              </div>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </section>
  )
}

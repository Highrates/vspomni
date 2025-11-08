'use client'

import { Swiper, SwiperSlide } from 'swiper/react'
import { Autoplay, Pagination, Navigation, EffectFade } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/pagination'
import 'swiper/css/navigation'
import 'swiper/css/effect-fade'

import { motion } from 'framer-motion'
import { useState } from 'react'

const slides = [
  {
    id: 1,
    leftImage: '/images/hero-left-1.jpg',
    rightImage: '/images/hero-right-1.jpg',
    logoText: 'ВСПОМНИ',
    badgeImage: '/images/hero-badge.png',
    title: 'АРОМАТ, ЧТО ОСТАЁТСЯ',
    text: 'Каждый аромат — это история, сотканная из чувств, мгновений и памяти.',
  },
  {
    id: 2,
    leftImage: '/images/hero-left-1.jpg',
    rightImage: '/images/hero-right-1.jpg',
    logoText: 'ВСПОМНИ',
    badgeImage: '/images/hero-badge.png',
    title: 'ВСПОМНИ ТО, ЧТО ДОРОГО',
    text: 'Почувствуй эмоции, которые возвращают тебя в самые тёплые моменты жизни.',
  },
]

export default function Hero() {
  const [activeIndex, setActiveIndex] = useState(0)

  return (
    <section className="relative w-full overflow-hidden">
      <Swiper
        modules={[Autoplay, Pagination, Navigation, EffectFade]}
        autoplay={{ delay: 6000, disableOnInteraction: false }}
        pagination={{ clickable: true }}
        navigation
        loop
        effect="fade"
        speed={900}
        onSlideChange={(swiper) => setActiveIndex(swiper.realIndex)}
        className="w-full h-[80vh] sm:h-[85vh] md:h-[90vh]"
      >
        {slides.map((slide, index) => (
          <SwiperSlide key={slide.id}>
            <div className="flex flex-col md:flex-row w-full h-full">
              {/* ===== LEFT COLUMN ===== */}
              <div
                className={`relative flex-1 h-[60vh] sm:h-[380px] md:h-full overflow-hidden
              ${index === activeIndex ? 'z-10' : 'z-0'}
              rounded-[24px] md:rounded-l-[24px] md:rounded-tr-none md:rounded-br-none
            `}
              >
                <img
                  src={slide.leftImage}
                  alt="left"
                  className="object-cover w-full h-full"
                />

                {/* ЛОГО */}
                <motion.div
                  key={activeIndex + '-logo'}
                  initial={{ opacity: 0, x: -40 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                  className="absolute top-4 left-4 sm:top-6 sm:left-6 text-[20px] sm:text-[28px] md:text-[32px] font-bold text-black"
                >
                  {slide.logoText}
                </motion.div>

                {/* ТЕКСТОВАЯ ПЛАШКА */}
                <motion.div
                  key={activeIndex + '-badge'}
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
                  className="absolute left-3 right-3 sm:left-6 sm:right-6 bottom-4 md:bottom-8 flex items-center gap-3 sm:gap-5 bg-white/70 backdrop-blur-md rounded-[10px] p-3 sm:p-6 shadow-[0_4px_20px_rgba(0,0,0,0.08)]"
                >
                  {/* Левая мини-картинка */}
                  <motion.div
                    key={activeIndex + '-img'}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                    className="w-[60px] h-[60px] sm:w-[90px] sm:h-[90px] flex-shrink-0"
                  >
                    <img
                      src={slide.badgeImage}
                      alt="badge"
                      className="object-contain w-full h-full"
                    />
                  </motion.div>

                  {/* Текст справа */}
                  <motion.div
                    key={activeIndex + '-text'}
                    initial={{ opacity: 0, x: 15 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: 0.35 }}
                    className="flex flex-col justify-center text-black"
                  >
                    <h2 className="text-[15px] sm:text-[18px] md:text-[20px] font-semibold mb-1 leading-tight">
                      {slide.title}
                    </h2>
                    <p className="text-[13px] sm:text-[15px] text-black/70 leading-snug max-w-[90%] sm:max-w-[430px]">
                      {slide.text}
                    </p>
                  </motion.div>
                </motion.div>
              </div>

              {/* ===== RIGHT COLUMN ===== */}
              <motion.div
                key={activeIndex + '-right'}
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, ease: 'easeOut', delay: 0.25 }}
                className="relative hidden md:flex flex-1 h-full items-center justify-center bg-white overflow-hidden
              rounded-[24px] md:rounded-r-[24px] md:rounded-tl-none md:rounded-bl-none
            "
              >
                <img
                  src={slide.rightImage}
                  alt="product"
                  className="object-cover w-full h-full"
                />
              </motion.div>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </section>
  )
}

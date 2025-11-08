'use client'

import 'swiper/css'
import 'swiper/css/navigation'
import 'swiper/css/pagination'
import { Autoplay, Navigation, Pagination } from 'swiper/modules'
import { Swiper, SwiperSlide } from 'swiper/react'

import { motion } from 'framer-motion'
import ChoiceCard, { ChoiceCardProps } from './ChoiceCard'

export const mockChoices: ChoiceCardProps[] = [
  {
    id: 1,
    image: '/images/choice-1.jpg',
    name: 'Анастасия Волочкова',
    perfume: 'Кашемир и слива',
    date: '17 мая 2025',
    oldPrice: '15 250 ₽',
    price: '12 890 ₽',
    locked: true,
  },
  {
    id: 2,
    image: '/images/choice-2.jpg',
    name: 'Эльдар',
    perfume: 'Глубина ночи',
    date: '14 мая 2025',
    oldPrice: '15 250 ₽',
    price: '12 890 ₽',
  },
  {
    id: 3,
    image: '/images/choice-3.jpg',
    name: 'Алексей',
    perfume: 'Лес после дождя',
    date: '10 мая 2025',
    oldPrice: '15 250 ₽',
    price: '12 890 ₽',
  },
  {
    id: 4,
    image: '/images/choice-4.jpg',
    name: 'Мария',
    perfume: 'Цветы в окне',
    date: '7 мая 2025',
    oldPrice: '15 250 ₽',
    price: '12 890 ₽',
  },
]

export default function Choice() {
  return (
    <section className="mt-20 px-2">
      <h2 className="text-[28px] sm:text-[32px] font-semibold text-black mb-8 flex items-center gap-2">
        Выбор <span className="text-[20px] sm:text-[24px]">⭐</span>
      </h2>

      <Swiper
        modules={[Autoplay, Pagination, Navigation]}
        spaceBetween={20}
        grabCursor
        autoplay={{ delay: 5500, disableOnInteraction: false }}
        navigation
        className="choice-swiper pb-10 rounded-[20px]"
        breakpoints={{
          0: { slidesPerView: 1, spaceBetween: 16 },          // mobile
          480: { slidesPerView: 1.2, spaceBetween: 18 },       // small devices
          640: { slidesPerView: 1.5, spaceBetween: 20 },       // tablets
          768: { slidesPerView: 2, spaceBetween: 22 },         // medium
          1024: { slidesPerView: 2.5, spaceBetween: 24 },      // laptop
          1280: { slidesPerView: 3, spaceBetween: 24 },        // large desktop
        }}
      >
        {mockChoices.map((card) => (
          <SwiperSlide key={card.id} className="!w-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
              className="w-[280px] sm:w-[340px] md:w-[420px] lg:w-[498px] h-auto"
            >
              <ChoiceCard {...card} />
            </motion.div>
          </SwiperSlide>
        ))}
      </Swiper>
    </section>
  )
}

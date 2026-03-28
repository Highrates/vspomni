'use client'

import 'swiper/css'
import 'swiper/css/navigation'
import 'swiper/css/pagination'
import { Autoplay, Navigation, Pagination } from 'swiper/modules'
import { Swiper, SwiperSlide } from 'swiper/react'

import { motion } from 'framer-motion'
import ChoiceCard from './ChoiceCard'
import type { StarChoiceItem } from '@/types/product'

type Props = {
  products: StarChoiceItem[]
}

const slideClass =
  '!box-border !shrink-0 !h-auto !w-[calc(100vw-48px)] sm:!w-[340px] md:!w-[420px] lg:!w-[420px]'

export default function ChoiceSwiper({ products }: Props) {
  if (products.length === 0) return null

  return (
    <Swiper
      modules={[Autoplay, Pagination, Navigation]}
      slidesPerView="auto"
      spaceBetween={12}
      grabCursor
      allowTouchMove
      simulateTouch
      threshold={5}
      touchRatio={1}
      preventClicks
      preventClicksPropagation
      autoplay={{ delay: 5500, disableOnInteraction: false }}
      navigation={{ enabled: true }}
      className="choice-swiper pb-10 rounded-[20px] [&_.swiper-button-prev]:hidden [&_.swiper-button-next]:hidden sm:[&_.swiper-button-prev]:flex sm:[&_.swiper-button-next]:flex"
      breakpoints={{
        640: { spaceBetween: 20 },
        768: { spaceBetween: 22 },
        1024: { spaceBetween: 24 },
      }}
    >
      {products.map((product) => (
        <SwiperSlide key={product.id} className={slideClass}>
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="h-auto w-full"
          >
            <ChoiceCard product={product} />
          </motion.div>
        </SwiperSlide>
      ))}
    </Swiper>
  )
}

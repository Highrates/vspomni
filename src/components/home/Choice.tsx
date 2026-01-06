'use client'

import 'swiper/css'
import 'swiper/css/navigation'
import 'swiper/css/pagination'
import { Autoplay, Navigation, Pagination } from 'swiper/modules'
import { Swiper, SwiperSlide } from 'swiper/react'

import { motion } from 'framer-motion'
import ChoiceCard, { ChoiceCardProps } from './ChoiceCard'
import { useStarChoiceStore  } from '@/stores/useStarChoice'
import { useEffect } from 'react'

export default function Choice() {

  const { products,  fetchProducts } = useStarChoiceStore();

     useEffect(()=>{
        fetchProducts();
      },[])

  // Дублируем продукты для проверки скролла (временно)
  const extendedProducts = [...products, ...products.map((p, i) => ({ ...p, id: `${p.id}-copy-${i}` }))]

  return (
    <section className="mt-6 sm:mt-10 md:mt-14 lg:mt-20 py-4 px-2">
      <h2 className="text-xl sm:text-[36px] md:text-[42px] lg:text-[48px] font-semibold text-black mb-6 sm:mb-8 flex items-center gap-2">
        Выбор <span className="text-[20px] sm:text-[24px]">⭐</span>
      </h2>

      <Swiper
        modules={[Autoplay, Pagination, Navigation]}
        slidesPerView="auto"
        spaceBetween={12}
        grabCursor
        allowTouchMove
        autoplay={{ delay: 5500, disableOnInteraction: false }}
        navigation={{
          enabled: true,
        }}
        className="choice-swiper pb-10 rounded-[20px] [&_.swiper-button-prev]:hidden [&_.swiper-button-next]:hidden sm:[&_.swiper-button-prev]:flex sm:[&_.swiper-button-next]:flex"
        breakpoints={{
          640: { spaceBetween: 20 },
          768: { spaceBetween: 22 },
          1024: { spaceBetween: 24 },
        }}
      >
        {extendedProducts.map((product) => (
          <SwiperSlide key={product.id} className="!w-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
              className="w-[calc(100vw-48px)] sm:w-[340px] md:w-[420px] lg:w-[420px] h-auto"
            >
              <ChoiceCard product={product} />
            </motion.div>
          </SwiperSlide>
        ))}
      </Swiper>
    </section>
  )
}

'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import { ShoppingBag } from 'lucide-react'
import Link from 'next/link'
import ProductTag from '@/components/ui/ProductTag'
import { useIsClient } from '@/lib/hooks'

const scents = [
  {
    id: 1,
    name: 'Vanilla Sky',
    price: 4200,
    img: '/images/catalog.png',
    tags: ['flower', 'sweet', 'wood'],
  },
  {
    id: 2,
    name: 'Cedar Breeze',
    price: 3950,
    img: '/images/catalog.png',
    tags: ['wood'],
  },
  {
    id: 3,
    name: 'Amber Night',
    price: 4800,
    img: '/images/catalog.png',
    tags: ['sweet'],
  },
  {
    id: 4,
    name: 'Jasmine Whisper',
    price: 4300,
    img: '/images/catalog.png',
    tags: ['flower'],
  },
]

export default function PopularScents() {
  const isClient = useIsClient()
  return (
    <section className="mt-12 sm:mt-16 md:mt-20 lg:mt-24 mb-16 sm:mb-20 md:mb-24 lg:mb-32 overflow-hidden px-4 sm:px-6 md:px-8">
      <div>
        {/* Заголовок */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="flex items-center justify-between mb-8 sm:mb-10 md:mb-12"
        >
          <h2 className="text-[28px] sm:text-[36px] md:text-[42px] lg:text-[48px] font-semibold text-black leading-tight">
            Популярные ароматы
          </h2>

          <Link
            href="/catalog"
            className="flex items-center gap-[6px] text-[14px] sm:text-[15px] md:text-[16px] font-medium text-black hover:opacity-70 transition whitespace-nowrap"
          >
            Все{' '}
            <svg
              width="8"
              height="14"
              viewBox="0 0 8 14"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="flex-shrink-0"
            >
              <path
                d="M0.75 0.75L7 7L0.75 13.25"
                stroke="#111111"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>
        </motion.div>

        {/* Сетка карточек */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5 md:gap-6 popular-scents-grid">
          {scents.map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              viewport={{ once: true }}
              className="group relative w-full max-w-[369px] mx-auto cursor-pointer"
            >
              {/* Изображение */}
              <div className="relative w-full aspect-[369/384] overflow-hidden rounded-xl sm:rounded-2xl bg-neutral-100 transition-all duration-500 group-hover:shadow-lg group-hover:-translate-y-[2px]">
                <Image
                  src={item.img}
                  alt={item.name}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 369px"
                />

                {/* бейдж 100 мл — внизу слева */}
                <div className="absolute bottom-2 sm:bottom-3 left-2 sm:left-3 bg-white/90 backdrop-blur-sm text-[12px] sm:text-[14px] font-medium text-black/60 px-2 py-0.5 rounded-full border border-neutral-200">
                  100 мл
                </div>
              </div>

              {/* Подписи под карточкой */}
              <div className="mt-4 sm:mt-5 transition-all duration-300 group-hover:-translate-y-[2px]">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-[18px] sm:text-[20px] font-semibold text-black leading-tight group-hover:text-neutral-800 transition">
                      {item.name}
                    </h3>

                    {/* Теги (ProductTag) */}
                    {item.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2 sm:mt-3 min-h-[28px] sm:min-h-[32px]">
                        {item.tags.map((tag, index) => (
                          <ProductTag
                            tag={tag as any}
                            key={tag + '_' + index}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Кнопка корзины */}
                  <button
                    aria-label="Добавить в корзину"
                    className="bg-black text-white rounded-full w-[38px] h-[38px] sm:w-[42px] sm:h-[42px] flex items-center justify-center shadow-md hover:bg-neutral-800 transition flex-shrink-0"
                  >
                    <ShoppingBag size={18} strokeWidth={1.8} color="#fff" className="sm:w-5 sm:h-5" />
                  </button>
                </div>

                {/* Цена */}
                <p className="text-[14px] sm:text-[15px] font-semibold text-black mt-3 sm:mt-4">
                  {isClient
                    ? Number(item.price).toLocaleString('ru-RU')
                    : item.price}
                  <span> ₽</span>
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
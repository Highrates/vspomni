'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import { ArrowUpRight } from 'lucide-react'

const comingSoon = [
  {
    id: 1,
    title: 'Парфюм для интерьера',
    img: '/images/catalog.png',
  },
  {
    id: 2,
    title: 'Саше',
    img: '/images/catalog.png',
  },
]

export default function ComingSoon() {
  return (
    <section className="mt-24 mb-28">
      <div className="mx-auto  px-4">
        {/* Сетка 2 карточки */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {comingSoon.map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              viewport={{ once: true }}
              className="relative overflow-hidden rounded-2xl cursor-pointer group"
            >
              {/* Изображение */}
              <div className="relative w-full aspect-[3/2]">
                <Image
                  src={item.img}
                  alt={item.title}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                />
              </div>

              {/* Затемнение при hover */}
              <div className="absolute inset-0 bg-black/20 group-hover:bg-black/35 transition-all duration-500" />

              {/* Бейдж */}
              <div className="absolute top-4 left-4 backdrop-blur-sm text-[16px] font-medium  px-3 py-[4px] rounded-full text-white">
                Скоро в продаже
              </div>

              {/* Текст и стрелка */}
              <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
                <h3 className="text-white text-[20px] font-semibold drop-shadow-md">
                  {item.title}
                </h3>
                <div className="bg-white/90 backdrop-blur-sm rounded-full p-2 hover:bg-white transition">
                  <ArrowUpRight
                    size={18}
                    strokeWidth={1.8}
                    className="text-black"
                  />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

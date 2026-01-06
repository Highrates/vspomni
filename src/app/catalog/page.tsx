'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowUpRight } from 'lucide-react'
import PopularScentsAlt from '@/components/features/PopularScentsAlt'
import { useCategoriesStore } from '@/stores/useCategories'
import { Category } from '@/types/category'

export default function CatalogPage() {
  const { categories, fetchCategories } = useCategoriesStore()

  useEffect(() => {
    fetchCategories()
  }, [])

  return (
    <div className="px-0 -mt-63 sm:-mt-74 md:-mt-90">
      {/* Hero Section */}
      <section className="relative mb-23 z-20">
        <div className="container mx-auto px-4 sm:px-6 md:px-8 pt-24 sm:pt-28 md:pt-40 pb-6 sm:pb-8 md:pb-12">
          <h1 className="text-2xl sm:text-3xl md:text-3xl font-semibold text-white drop-shadow-lg">
            Каталог
          </h1>
        </div>
      </section>
      {/* Product Sections */}
      <div className="flex w-full flex-col gap-5 sm:gap-6 md:gap-8 lg:gap-10 mb-16 sm:mb-20 md:mb-32 lg:mb-45">
        {categories.map((category: Category, i: number) => (
          <Link
            key={category.id}
            href={'/category/' + category.slug}
            className="block w-full h-[280px] sm:h-[350px] md:h-[450px] lg:h-[598px] rounded-[10px] sm:rounded-[12px] lg:rounded-[20px] z-1 relative group overflow-hidden"
          >
            <div
              className={
                'w-full h-[280px] sm:h-[350px] md:h-[450px] lg:h-[598px] rounded-[10px] sm:rounded-[12px] lg:rounded-[20px] z-2 absolute flex flex-col justify-between p-4 sm:p-6 md:p-10 lg:p-13.5 bg-linear-to-r from-[#00000051]' +
                (i % 2 === 0 ? '' : ' items-start lg:items-end ')
              }
            >
              <span className="text-white text-xl sm:text-[28px] md:text-[36px] lg:text-[48px] font-semibold select-none z-3">
                {category.name}
              </span>
              <span
                dangerouslySetInnerHTML={{
                  __html: category.description,
                }}
                className="text-white w-full sm:w-[400px] md:w-[450px] lg:w-[559px] text-xs sm:text-sm md:text-base lg:text-lg font-normal select-none z-3"
              ></span>
            </div>

            {/* Кнопка со стрелкой в углу (скрыта на мобилке) */}
            <div className="hidden sm:flex absolute bottom-4 right-4 md:bottom-5 md:right-5 lg:bottom-6 lg:right-6 z-10 w-[48px] h-[48px] md:w-[56px] md:h-[56px] rounded-full bg-white/80 backdrop-blur-[10px] items-center justify-center transition-transform duration-300 group-hover:scale-110">
              <ArrowUpRight
                className="w-[18px] h-[18px] md:w-[20px] md:h-[20px] text-black"
                strokeWidth={1.5}
              />
            </div>
            <Image
              src={category.backgroundImage}
              alt="image one"
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1728px) 1536px, 1536px"
              className="rounded-[12px] lg:rounded-[20px] object-cover object-top-right transition-transform duration-500 group-hover:scale-105"
            />
          </Link>
        ))}
      </div>

      <PopularScentsAlt />
    </div>
  )
}

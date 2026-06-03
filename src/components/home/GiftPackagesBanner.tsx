'use client'

import Image from 'next/image'
import { ArrowUpRight } from 'lucide-react'
import { useEffect, useState } from 'react'
import { getCategoryById } from '@/graphql/queries/category.service'
import { GIFT_PACKAGES_CATEGORY_ID } from '@/lib/category/catalogCategories'
import { Category } from '@/types/category'
import Link from 'next/link'

type Props = {
  /** Категория с сервера (SSR) — ссылка сразу в HTML */
  initialCategory?: Category | null
}

export default function GiftPackagesBanner({
  initialCategory = null,
}: Props) {
  const [category, setCategory] = useState<Category | null>(initialCategory)
  const [loading, setLoading] = useState(!initialCategory)

  useEffect(() => {
    setCategory(initialCategory)
    setLoading(!initialCategory)
  }, [initialCategory])

  useEffect(() => {
    if (initialCategory) return

    let cancelled = false

    const fetchCategory = async () => {
      try {
        const data = await getCategoryById(GIFT_PACKAGES_CATEGORY_ID)
        if (!cancelled && data) setCategory(data)
      } catch (error) {
        console.error('GiftPackagesBanner: failed to fetch category', error)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchCategory()
    return () => {
      cancelled = true
    }
  }, [initialCategory])

  if (loading) {
    return (
      <section className="relative w-full overflow-hidden px-2 mt-4 sm:mt-6 md:mt-8 lg:mt-10 mb-4 sm:mb-6 md:mb-8 lg:mb-10">
        <div className="relative w-full h-[170px] sm:h-[240px] md:h-[300px] lg:h-[340px] overflow-hidden rounded-[16px] bg-gray-200 animate-pulse" />
      </section>
    )
  }

  if (!category) {
    return null
  }

  return (
    <section className="relative w-full overflow-hidden px-2 mt-4 sm:mt-6 md:mt-8 lg:mt-10 mb-4 sm:mb-6 md:mb-8 lg:mb-10">
      <Link
        href={`/category/${encodeURIComponent(category.slug)}`}
        className="block relative w-full h-full"
      >
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
          <div className="flex items-center justify-center gap-4 sm:gap-5 md:gap-6">
            <h6 className="text-[16px] sm:text-[28px] md:text-[32px] lg:text-[48px] font-semibold select-none text-white leading-[1.2] lg:leading-[52px]">
              {category.name}
            </h6>

            <div className="hidden sm:flex w-[40px] h-[40px] md:w-[49px] md:h-[49px] rounded-full bg-white/50 backdrop-blur-[10px] items-center justify-center flex-shrink-0">
              <ArrowUpRight className="w-[16px] h-[16px] md:w-[20px] md:h-[20px] text-black" strokeWidth={1.5} />
            </div>
          </div>
        </div>

        <div className="relative w-full h-[170px] sm:h-[240px] md:h-[300px] lg:h-[340px] overflow-hidden rounded-[16px]">
          {category.backgroundImage ? (
            <Image
              src={category.backgroundImage}
              alt={category.name || 'Подарочные пакеты'}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 768px) 95vw, (max-width: 1600px) 98vw, 1536px"
              className="rounded-[16px] object-cover"
              onError={(e) => {
                const target = e.currentTarget as HTMLImageElement
                target.style.display = 'none'
              }}
            />
          ) : (
            <div className="absolute inset-0 bg-neutral-300 rounded-[16px]" />
          )}
          <div className="absolute inset-0 bg-black/25 rounded-[16px]" />
        </div>
      </Link>
    </section>
  )
}

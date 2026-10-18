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
      <section className="relative w-full overflow-hidden px-0 mt-4 sm:mt-6 md:mt-8 lg:mt-10 mb-4 sm:mb-6 md:mb-8 lg:mb-10">
        <div className="relative w-full h-[170px] sm:h-[240px] md:h-[300px] lg:h-[340px] overflow-hidden rounded-[16px] bg-gray-200 animate-pulse" />
      </section>
    )
  }

  if (!category) {
    return null
  }

  return (
    <section className="relative w-full overflow-hidden px-0 mt-4 sm:mt-6 md:mt-8 lg:mt-10 mb-4 sm:mb-6 md:mb-8 lg:mb-10">
      <Link
        href={`/category/${encodeURIComponent(category.slug)}`}
        className="block relative w-full h-full"
      >
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center px-4 sm:px-6">
          <div className="flex max-w-full items-center justify-center gap-3 sm:gap-5 md:gap-6">
            <h6 className="line-clamp-2 text-center text-[16px] font-semibold leading-[1.2] text-white select-none sm:text-[28px] md:text-[32px] lg:text-[48px] lg:leading-[52px]">
              {category.name}
            </h6>

            <div className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/50 backdrop-blur-[10px] sm:flex md:h-[49px] md:w-[49px]">
              <ArrowUpRight
                className="h-4 w-4 text-black md:h-5 md:w-5"
                strokeWidth={1.5}
              />
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

'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import ProductCard from '@/components/home/ProductCard'
import { ProductCardItem } from '@/types/product'
import { usePopularScentsStore } from '@/stores/usePopularScents'

export default function PopularScentsAlt() {
  const { greed, fetchGrid } = usePopularScentsStore()

  useEffect(() => {
    fetchGrid()
  }, [])

  return (
    <section className="mb-4 mt-4 sm:mb-6 sm:mt-6 md:mb-8 md:mt-8 lg:mb-10 lg:mt-10 px-4 sm:px-6 md:px-8 py-2">
      <div className="flex items-center justify-between mb-4 sm:mb-5 md:mb-6 gap-3">
        <h3 className="text-xl sm:text-[36px] md:text-[42px] lg:text-[48px] font-semibold select-none">
          Диффузоры для дома
        </h3>
        <Link
          href="/catalog"
          className="text-base text-black font-medium flex items-center -ml-5"
        >
          <span className="text-md font-medium">Все</span>
          <Image
            src="/to_right.svg"
            alt="all news link"
            width={20}
            height={24}
            className="ml-1 h-auto"
          />
        </Link>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5 md:gap-6">
        {greed.slice(0, 4).map((product: ProductCardItem, index: number) => (
          <ProductCard product={product} key={product.id} isNew={index === 0} />
        ))}
      </div>
    </section>
  )
}

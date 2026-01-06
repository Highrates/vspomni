'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import ProductCard from '@/components/home/ProductCard'
import {  ProductCardItem } from '@/types/product'
import { usePopularScentsStore } from '@/stores/usePopularScents'

export default function PopularScentsAlt() {
  const { greed, fetchGrid } = usePopularScentsStore()

  useEffect(() => {
    fetchGrid()
  }, [])

  return (
    <section className="mb-8 mt-8 sm:mb-12 sm:mt-12 md:mb-20 md:mt-20 lg:mb-45 lg:mt-45 px-2 py-4">
      <div className="flex items-center justify-between mb-6 sm:mb-10 md:mb-14 gap-3">
        <h3 className="text-xl sm:text-[36px] md:text-[42px] lg:text-[48px] font-semibold select-none">
          Популярные ароматы
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
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5 p-2 -m-2">
        {greed.slice(0, 4).map((product: ProductCardItem, index: number) => (
          <ProductCard product={product} key={product.id} isNew={index === 0} />
        ))}
      </div>
    </section>
  )
}

'use client'

import { useEffect } from 'react'
import ProductCard from '@/components/home/ProductCard'
import { ProductCardItem } from '@/types/product'
import { useProductGridStore } from '@/stores/useProductGreed'

export default function ProductGrid() {

  const { greed,  fetchGridGraphQL } = useProductGridStore();

    useEffect(()=>{
      fetchGridGraphQL();
    },[])

  return (
    <section className="mt-6 mb-8 sm:mt-10 sm:mb-12 md:mt-20 md:mb-20 lg:mt-45 lg:mb-45 px-2 py-4">
      <div className="flex items-center justify-between mb-6 sm:mb-10 md:mb-14">
        <h3 className="text-xl sm:text-[36px] md:text-[42px] lg:text-[48px] font-semibold select-none">
          Все ароматы
        </h3>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 p-2 -m-2 pb-6">
        {greed.map((product: ProductCardItem, index: number) => (
          <ProductCard product={product} key={product.id} isNew={index < 2} />
        ))}
      </div>
    </section>
  )
}

'use client'

import { useEffect } from 'react'
import AllAromasItem from '@/components/home/AllAromasItem'
import { useAllAromasStore } from '@/stores/useAllAromas'

export default function ProductGrid() {
  const { items, fetchItems } = useAllAromasStore()

  useEffect(() => {
    fetchItems()
  }, [])

  return (
    <section className="mt-4 mb-2 sm:mt-6 sm:mb-3 md:mt-8 md:mb-4 lg:mt-10 lg:mb-5 px-2 py-2">
      <div className="flex items-center justify-between mb-4 sm:mb-5 md:mb-6">
        <h3 className="text-xl sm:text-[36px] md:text-[42px] lg:text-[48px] font-semibold select-none">
          Все ароматы Вспомни.
        </h3>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-6 p-2 -m-2">
        {items.map((item) => (
          <AllAromasItem item={item} key={item.id} />
        ))}
      </div>
    </section>
  )
}

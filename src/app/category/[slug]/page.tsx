'use client'

import { useParams } from 'next/navigation'
import { useEffect, useRef } from 'react'
import { useCategoriesStore } from '@/stores/useCategories'
import { ProductCardItem } from '@/types/product'
import BackButton from '@/components/ui/BackButton'
import ProductCard from '@/components/home/ProductCard'
import PageTransition from '@/components/layout/PageTransition'

export default function CategoryPage() {
  const { slug } = useParams()
  const { categories, items, fetchProductsByCategorySlug } =
    useCategoriesStore()

  const currentCategory = categories.find(
    (category) => category.slug === slug,
  )
  const categoryName = currentCategory?.name

  // Категория «Подарочные пакеты» — для неё не показываем ароматы под карточкой
  const isGiftPackages =
    currentCategory?.name?.toLowerCase() === 'подарочные пакеты' ||
    (typeof slug === 'string' && slug === 'podarochnye-pakety')
  const hideAromas = isGiftPackages
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!slug || typeof slug !== 'string') return
    fetchProductsByCategorySlug(slug).then(() => {
      retryTimerRef.current = setTimeout(() => {
        const { items: current } = useCategoriesStore.getState()
        if (current.length === 0) {
          fetchProductsByCategorySlug(slug)
        }
        retryTimerRef.current = null
      }, 800)
    })
    return () => {
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current)
        retryTimerRef.current = null
      }
    }
  }, [slug, fetchProductsByCategorySlug])

  const title = categoryName || (typeof slug === 'string' ? String(slug).replace(/-/g, ' ') : 'Категория')

  return (
    <PageTransition>
    <section className="mb-4 mt-4 sm:mb-6 sm:mt-6 md:mb-8 md:mt-8 lg:mb-10 lg:mt-10 px-2 py-2">
      <div className="mb-2">
        <BackButton />
      </div>

      <div className="flex items-center justify-between mb-4 sm:mb-5 md:mb-6">
        <h3 className="text-xl sm:text-[36px] md:text-[42px] lg:text-[48px] font-semibold select-none">
          {title}
        </h3>
      </div>

      {items.length < 1 && (
        <p className="w-full min-h-[120px] flex justify-center items-center text-black/70 text-base sm:text-lg">
          Нет товаров в данной категории
        </p>
      )}

      {items.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5 w-full min-w-0 p-2 -m-2">
          {items.map((product: ProductCardItem, index: number) => (
            <ProductCard
              product={product}
              key={product.id}
              isNew={index < 2}
              hideAromas={hideAromas}
            />
          ))}
        </div>
      )}
    </section>
    </PageTransition>
  )
}

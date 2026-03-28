'use client'

import { useEffect, useRef, useState } from 'react'
import { useCategoriesStore } from '@/stores/useCategories'
import { ProductCardItem } from '@/types/product'
import CatalogCategoryBanners from '@/components/catalog/CatalogCategoryBanners'
import BackButton from '@/components/ui/BackButton'
import ProductCard from '@/components/home/ProductCard'
import PageTransition from '@/components/layout/PageTransition'

type Props = {
  slug: string
  /** Имя категории с API (сервер), без подстановки из slug */
  initialCategoryTitle: string
}

export default function CategoryPageClient({
  slug,
  initialCategoryTitle,
}: Props) {
  const { categories, items, fetchProductsByCategorySlug } =
    useCategoriesStore()

  const currentCategory = categories.find(
    (category) => category.slug === slug,
  )
  const categoryName = currentCategory?.name

  const isGiftPackages =
    currentCategory?.name?.toLowerCase() === 'подарочные пакеты' ||
    slug === 'podarochnye-pakety'
  const hideAromas = isGiftPackages
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    const load = async () => {
      await fetchProductsByCategorySlug(slug)
      if (!cancelled) setLoading(false)

      retryTimerRef.current = setTimeout(() => {
        const { items: current } = useCategoriesStore.getState()
        if (current.length === 0 && !cancelled) {
          void fetchProductsByCategorySlug(slug)
        }
        retryTimerRef.current = null
      }, 800)
    }

    void load()

    return () => {
      cancelled = true
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current)
        retryTimerRef.current = null
      }
    }
  }, [slug, fetchProductsByCategorySlug])

  const title =
    initialCategoryTitle ||
    categoryName ||
    slug.replace(/-/g, ' ') ||
    'Категория'

  return (
    <PageTransition>
      <section className="mb-4 mt-4 sm:mb-6 sm:mt-6 md:mb-8 md:mt-8 lg:mb-10 lg:mt-10 px-2 py-2">
        <div className="mb-2">
          <BackButton />
        </div>

        <div className="flex items-center justify-between mb-4 sm:mb-5 md:mb-6">
          <h1 className="text-xl sm:text-[36px] md:text-[42px] lg:text-[48px] font-semibold select-none">
            {title}
          </h1>
        </div>

        {loading && (
          <div
            className="w-full min-h-[200px] flex flex-col items-center justify-center gap-4 py-8"
            role="status"
            aria-live="polite"
            aria-busy="true"
          >
            <div
              className="h-10 w-10 sm:h-12 sm:w-12 rounded-full border-2 border-black/15 border-t-black/70 animate-spin"
              aria-hidden
            />
            <p className="text-sm sm:text-base text-black/60">Загрузка товаров…</p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5 w-full min-w-0 p-2 -m-2">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div
                  key={i}
                  className="rounded-xl bg-black/[0.06] aspect-[3/4] animate-pulse"
                  aria-hidden
                />
              ))}
            </div>
          </div>
        )}

        {!loading && items.length < 1 && (
          <p className="w-full min-h-[120px] flex justify-center items-center text-black/70 text-base sm:text-lg">
            Нет товаров в данной категории
          </p>
        )}

        {!loading && items.length > 0 && (
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

      <CatalogCategoryBanners excludeSlug={slug} />
    </PageTransition>
  )
}

'use client'

import { useEffect, useRef, useState } from 'react'
import { useCategoriesStore } from '@/stores/useCategories'
import { ProductCardItem } from '@/types/product'
import { getProductsByCategorySlug } from '@/graphql/queries/product.service'
import CatalogCategoryBanners from '@/components/catalog/CatalogCategoryBanners'
import BackButton from '@/components/ui/BackButton'
import ProductCard from '@/components/home/ProductCard'
import PageTransition from '@/components/layout/PageTransition'

type Props = {
  slug: string
  initialCategoryTitle: string
  /** Товары с сервера (SSR) — сразу в HTML для SEO */
  initialProducts?: ProductCardItem[]
  hideAromas?: boolean
}

export default function CategoryPageClient({
  slug,
  initialCategoryTitle,
  initialProducts = [],
  hideAromas: hideAromasProp = false,
}: Props) {
  const { categories, fetchProductsByCategorySlug } = useCategoriesStore()

  const currentCategory = categories.find((category) => category.slug === slug)
  const categoryName = currentCategory?.name

  const hideAromasFromCategory =
    currentCategory?.name?.toLowerCase() === 'подарочные пакеты' ||
    slug === 'podarochnye-pakety'
  const hideAromas = hideAromasProp || hideAromasFromCategory

  const [products, setProducts] = useState<ProductCardItem[]>(initialProducts)
  const [loading, setLoading] = useState(initialProducts.length === 0)
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setProducts(initialProducts)
    setLoading(initialProducts.length === 0)
    useCategoriesStore.setState({ items: initialProducts })
  }, [slug, initialProducts])

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      if (initialProducts.length > 0) {
        try {
          const fresh = await getProductsByCategorySlug(slug)
          if (!cancelled && fresh.length > 0) {
            setProducts(fresh)
            useCategoriesStore.setState({ items: fresh })
          }
        } catch {
          // оставляем SSR-данные
        }
        return
      }

      setLoading(true)
      await fetchProductsByCategorySlug(slug)
      if (!cancelled) {
        const fromStore = useCategoriesStore.getState().items
        setProducts(fromStore)
        setLoading(false)
      }

      retryTimerRef.current = setTimeout(() => {
        const { items: current } = useCategoriesStore.getState()
        if (current.length === 0 && !cancelled) {
          void fetchProductsByCategorySlug(slug).then(() => {
            if (!cancelled) {
              setProducts(useCategoriesStore.getState().items)
            }
          })
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
  }, [slug, fetchProductsByCategorySlug, initialProducts.length])

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

        {!loading && products.length < 1 && (
          <p className="w-full min-h-[120px] flex justify-center items-center text-black/70 text-base sm:text-lg">
            Нет товаров в данной категории
          </p>
        )}

        {!loading && products.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5 w-full min-w-0 p-2 -m-2">
            {products.map((product: ProductCardItem, index: number) => (
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

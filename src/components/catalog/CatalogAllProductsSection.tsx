'use client'

import { useState } from 'react'
import ProductCard from '@/components/home/ProductCard'
import { CATALOG_PAGE_SIZE } from '@/lib/catalog/catalogPageContent'
import { getCatalogProductsPage } from '@/graphql/queries/product.service'
import type { ProductCardItem } from '@/types/product'

type Props = {
  initialProducts: ProductCardItem[]
  initialHasNextPage: boolean
  initialEndCursor: string | null
}

export default function CatalogAllProductsSection({
  initialProducts,
  initialHasNextPage,
  initialEndCursor,
}: Props) {
  const [products, setProducts] = useState(initialProducts)
  const [hasNextPage, setHasNextPage] = useState(initialHasNextPage)
  const [endCursor, setEndCursor] = useState(initialEndCursor)
  const [loading, setLoading] = useState(false)

  const loadMore = async () => {
    if (!hasNextPage || loading || !endCursor) return

    setLoading(true)
    try {
      const page = await getCatalogProductsPage(CATALOG_PAGE_SIZE, endCursor)
      setProducts((prev) => [...prev, ...page.products])
      setHasNextPage(page.hasNextPage)
      setEndCursor(page.endCursor)
    } catch (error) {
      console.error('Failed to load more catalog products:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="px-2 py-2 mb-10 sm:mb-12 md:mb-16 lg:mb-20 relative z-10">
      <h2 className="text-xl sm:text-[36px] md:text-[42px] lg:text-[48px] font-semibold text-black mb-4 sm:mb-5 md:mb-6">
        Все товары
      </h2>
      {products.length === 0 ? (
        <p className="text-neutral-500 text-sm sm:text-base">
          Список товаров временно недоступен. Попробуйте обновить страницу позже.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5 p-2 -m-2">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
          {hasNextPage ? (
            <div className="mt-8 sm:mt-10 flex justify-center">
              <button
                type="button"
                onClick={loadMore}
                disabled={loading}
                className="rounded-full border border-black px-6 sm:px-8 py-3 text-sm sm:text-base font-medium text-black transition hover:bg-black hover:text-white disabled:opacity-50"
              >
                {loading ? 'Загрузка…' : 'Показать ещё'}
              </button>
            </div>
          ) : null}
        </>
      )}
    </section>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { getProductsByCategorySlug } from '@/graphql/queries/product.service'
import type { ProductCardItem } from '@/types/product'
import ProductCard from '@/components/home/ProductCard'

const GIFT_PACKAGES_CATEGORY_SLUG = 'podarochnye-pakety'

type Props = {
  /** Не показывать блок, если открыт товар из этой же категории */
  hideWhenCategorySlug?: string | null
}

export default function GiftPackagesUpsellSection({
  hideWhenCategorySlug,
}: Props) {
  const [items, setItems] = useState<ProductCardItem[]>([])
  const [loading, setLoading] = useState(true)

  const skip =
    hideWhenCategorySlug?.trim() === GIFT_PACKAGES_CATEGORY_SLUG

  useEffect(() => {
    if (skip) {
      setLoading(false)
      setItems([])
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const list = await getProductsByCategorySlug(GIFT_PACKAGES_CATEGORY_SLUG)
        if (!cancelled) setItems(Array.isArray(list) ? list : [])
      } catch {
        if (!cancelled) setItems([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [skip])

  if (skip || (!loading && items.length === 0)) return null

  return (
    <section className="relative z-10 px-4 sm:px-0 my-[40px]">
      <h2 className="text-xl sm:text-[36px] md:text-[42px] lg:text-[48px] font-semibold text-black mb-4 sm:mb-5 md:mb-6">
        Добавьте подарочный пакет
      </h2>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5 p-2 -m-2 w-full min-w-0">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="rounded-xl bg-black/[0.06] aspect-[3/4] animate-pulse"
              aria-hidden
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5 p-2 -m-2 w-full min-w-0">
          {items.map((product, index) => (
            <ProductCard
              key={product.id}
              product={product}
              isNew={index < 2}
              hideAromas
            />
          ))}
        </div>
      )}
    </section>
  )
}

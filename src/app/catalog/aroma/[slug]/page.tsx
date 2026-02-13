'use client'

import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { getAllAromas } from '@/graphql/queries/allAromas.service'
import { getProductsByAromaSlug, getProductsByAromaValue } from '@/graphql/queries/product.service'
import { ProductCardItem } from '@/types/product'
import BackButton from '@/components/ui/BackButton'
import ProductCard from '@/components/home/ProductCard'
import PageTransition from '@/components/layout/PageTransition'

export default function CatalogAromaPage() {
  const { slug } = useParams()
  const [aromaName, setAromaName] = useState<string | null>(null)
  const [products, setProducts] = useState<ProductCardItem[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!slug || typeof slug !== 'string') return
    let cancelled = false
    setLoading(true)
    setNotFound(false)
    ;(async () => {
      try {
        const aromas = await getAllAromas()
        const item = aromas.find((a) => a.slug === slug)
        if (!item || cancelled) {
          if (!cancelled) setNotFound(true)
          return
        }
        const name = item.text || item.title || ''
        if (!name || cancelled) {
          if (!cancelled) setNotFound(true)
          return
        }
        if (!cancelled) setAromaName(name)
        // Сначала по slug значения атрибута, затем по имени (fallback)
        let list = await getProductsByAromaSlug(slug)
        if (list.length === 0) list = await getProductsByAromaValue(name)
        if (!cancelled) setProducts(list)
      } catch {
        if (!cancelled) setNotFound(true)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [slug])

  const sectionClass = 'mb-4 mt-4 sm:mb-6 sm:mt-6 md:mb-8 md:mt-8 lg:mb-10 lg:mt-10 px-2 py-2'

  if (loading) {
    return (
      <PageTransition>
        <section className={sectionClass}>
          <div className="mb-2">
            <BackButton />
          </div>
          <div className="h-8 sm:h-10 md:h-12 w-48 sm:w-64 bg-black/10 rounded animate-pulse mb-4 sm:mb-5 md:mb-6" />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5 p-2 -m-2 w-full min-w-0">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="rounded-xl bg-black/10 aspect-[3/4] animate-pulse" />
            ))}
          </div>
        </section>
      </PageTransition>
    )
  }

  if (notFound || !aromaName) {
    return (
      <PageTransition>
        <section className={sectionClass}>
          <div className="mb-2">
            <BackButton />
          </div>
          <p className="w-full min-h-[100px] flex justify-center items-center">
            Аромат не найден
          </p>
        </section>
      </PageTransition>
    )
  }

  return (
    <PageTransition>
    <section className={sectionClass}>
      <div className="mb-2">
        <BackButton />
      </div>

      {products.length === 0 ? (
        <p className="w-full min-h-[100px] flex justify-center items-center">
          Нет товаров с этим ароматом
        </p>
      ) : (
        <>
          <div className="flex items-center justify-between mb-4 sm:mb-5 md:mb-6">
            <h3 className="text-xl sm:text-[36px] md:text-[42px] lg:text-[48px] font-semibold select-none">
              {aromaName}
            </h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5 p-2 -m-2 w-full min-w-0">
            {products.map((product, index) => (
              <ProductCard
                product={product}
                key={product.id}
                isNew={index < 2}
              />
            ))}
          </div>
        </>
      )}
    </section>
    </PageTransition>
  )
}

'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import {
  getAllAromas,
  getAromaDisplayTitle,
  type AllAromasItem,
} from '@/graphql/queries/allAromas.service'
import {
  getProductsByAromaSlug,
  getProductsByAromaValue,
} from '@/graphql/queries/product.service'
import { ProductCardItem } from '@/types/product'
import BackButton from '@/components/ui/BackButton'
import ProductCard from '@/components/home/ProductCard'
import PageTransition from '@/components/layout/PageTransition'
import { renderEditorJsContent } from '@/components/content/renderEditorJsContent'

type Props = { slug: string }

export default function CatalogAromaPageClient({ slug }: Props) {
  const [aroma, setAroma] = useState<AllAromasItem | null>(null)
  const [products, setProducts] = useState<ProductCardItem[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
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
        if (!cancelled) setAroma(item)
        const nameForFilter =
          item.text?.trim() || item.title?.trim() || ''
        let list = await getProductsByAromaSlug(slug)
        if (list.length === 0 && nameForFilter) {
          list = await getProductsByAromaValue(nameForFilter)
        }
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

  const sectionClass =
    'mb-4 mt-4 sm:mb-6 sm:mt-6 md:mb-8 md:mt-8 lg:mb-10 lg:mt-10 px-2 py-2'

  if (loading) {
    return (
      <PageTransition>
        <section className={sectionClass}>
          <div className="mb-2">
            <BackButton />
          </div>
          <div className="flex flex-row gap-4 sm:gap-8 mb-6 sm:mb-8 animate-pulse">
            <div className="w-[91px] max-w-[91px] shrink-0 min-h-[90px] aspect-[91/120] sm:w-[182px] sm:max-w-[182px] sm:min-h-[200px] sm:aspect-[182/240] rounded-2xl bg-black/10" />
            <div className="flex-1 space-y-4 min-w-0 max-w-[756px]">
              <div className="h-8 sm:h-10 md:h-12 w-3/4 bg-black/10 rounded" />
              <div className="h-20 w-full bg-black/10 rounded" />
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5 p-2 -m-2 w-full min-w-0">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="rounded-xl bg-black/10 aspect-[3/4] animate-pulse"
              />
            ))}
          </div>
        </section>
      </PageTransition>
    )
  }

  if (notFound || !aroma) {
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

  const pageTitle = getAromaDisplayTitle(aroma)

  const bodyFromContent = renderEditorJsContent(aroma.content, {
    bodyPreset: 'aroma',
  })
  const showTextFallback =
    !aroma.content?.trim() && Boolean(aroma.text?.trim())

  return (
    <PageTransition>
      <section className={sectionClass}>
        <div className="mb-2">
          <BackButton />
        </div>

        <div className="mb-6 sm:mb-8 md:mb-10 w-full min-w-0">
          <div className="inline-flex flex-row justify-start items-start gap-4 sm:gap-8 w-full min-w-0">
            {aroma.image ? (
              <div className="relative w-[91px] max-w-[91px] min-h-[90px] shrink-0 self-start sm:w-[182px] sm:max-w-[182px] sm:min-h-[180px] sm:self-stretch rounded-2xl overflow-hidden bg-neutral-100">
                <Image
                  src={aroma.image}
                  alt={pageTitle}
                  fill
                  className="object-cover"
                  sizes="(max-width: 639px) 91px, 182px"
                />
              </div>
            ) : null}

            <div className="inline-flex flex-col justify-start items-start gap-6 min-w-0 flex-1 max-w-[756px]">
              <h1 className="w-full min-w-0 text-black text-xl sm:text-[36px] md:text-[42px] lg:text-[48px] font-semibold select-none">
                {pageTitle}
              </h1>
              <div className="w-full min-w-0 space-y-4">
                {bodyFromContent}
                {showTextFallback ? (
                  <span className="font-normal text-xs sm:text-sm md:text-md select-none text-black whitespace-pre-line block">
                    {aroma.text}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        {products.length === 0 ? (
          <p className="w-full min-h-[100px] flex justify-center items-center">
            Нет товаров с этим ароматом
          </p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5 p-2 -m-2 w-full min-w-0">
            {products.map((product, index) => (
              <ProductCard
                product={product}
                key={product.id}
                isNew={index < 2}
              />
            ))}
          </div>
        )}
      </section>
    </PageTransition>
  )
}

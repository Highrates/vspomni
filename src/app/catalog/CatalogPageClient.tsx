'use client'

import CatalogAllProductsSection from '@/components/catalog/CatalogAllProductsSection'
import CatalogCategoryBanners from '@/components/catalog/CatalogCategoryBanners'
import PageTransition from '@/components/layout/PageTransition'
import type { ProductCardItem } from '@/types/product'

type Props = {
  allProducts: ProductCardItem[]
}

export default function CatalogPageClient({ allProducts }: Props) {
  return (
    <PageTransition className="px-0 -mt-63 sm:-mt-74 md:-mt-90">
      <section className="relative mb-23 z-20">
        <div className="container mx-auto px-4 sm:px-0 pt-24 sm:pt-28 md:pt-40 pb-6 sm:pb-8 md:pb-12">
          <h1 className="text-2xl sm:text-3xl md:text-3xl font-semibold text-white drop-shadow-lg">
            Каталог
          </h1>
        </div>
      </section>
      <CatalogCategoryBanners />

      <CatalogAllProductsSection products={allProducts} />
    </PageTransition>
  )
}

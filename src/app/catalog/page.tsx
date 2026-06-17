import type { Metadata } from 'next'
import CatalogAllProductsSection from '@/components/catalog/CatalogAllProductsSection'
import CatalogCategoryBannersView from '@/components/catalog/CatalogCategoryBannersView'
import CatalogHero from '@/components/catalog/CatalogHero'
import CatalogPageNoscript from '@/components/catalog/CatalogPageNoscript'
import ProductGrid from '@/components/home/ProductGrid'
import PublicPageBreadcrumbs from '@/components/layout/PublicPageBreadcrumbs'
import {
  CATALOG_DESCRIPTION,
  CATALOG_KEYWORDS,
  CATALOG_PAGE_SIZE,
  CATALOG_TITLE,
} from '@/lib/catalog/catalogPageContent'
import { sortCatalogCategories } from '@/lib/category/catalogCategories'
import { loadAllCategories } from '@/lib/category/loadAllCategories'
import { breadcrumbCatalogPage } from '@/lib/seo/breadcrumbItems'
import { buildPageMetadata } from '@/lib/seo/buildPageMetadata'
import { catalogPageJsonLd } from '@/lib/seo/catalogJsonLd'
import { getCatalogProductsPage } from '@/graphql/queries/product.service'

export const metadata: Metadata = buildPageMetadata({
  title: CATALOG_TITLE,
  description: CATALOG_DESCRIPTION,
  canonicalPath: '/catalog',
  keywords: CATALOG_KEYWORDS,
})

export const revalidate = 60

export default async function CatalogPage() {
  const [productsPage, categories] = await Promise.all([
    getCatalogProductsPage(CATALOG_PAGE_SIZE).catch(() => ({
      products: [],
      hasNextPage: false,
      endCursor: null,
    })),
    loadAllCategories(),
  ])

  const sortedCategories = sortCatalogCategories(categories)
  const jsonLd = catalogPageJsonLd(sortedCategories, productsPage.products)

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <CatalogPageNoscript
        categories={sortedCategories}
        products={productsPage.products}
      />
      <div className="px-0 -mt-63 sm:-mt-74 md:-mt-90">
        <CatalogHero />
        <PublicPageBreadcrumbs
          items={breadcrumbCatalogPage()}
          currentPath="/catalog"
          variant="container"
          className="relative z-10"
        />
        <CatalogCategoryBannersView categories={sortedCategories} />
        <ProductGrid />
        <CatalogAllProductsSection
          initialProducts={productsPage.products}
          initialHasNextPage={productsPage.hasNextPage}
          initialEndCursor={productsPage.endCursor}
        />
      </div>
    </>
  )
}

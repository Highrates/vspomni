import type { Metadata } from 'next'
import { getCatalogAllProducts } from '@/graphql/queries/product.service'
import { loadAllCategories } from '@/lib/category/loadAllCategories'
import PublicPageBreadcrumbs from '@/components/layout/PublicPageBreadcrumbs'
import { breadcrumbCatalogPage } from '@/lib/seo/breadcrumbItems'
import { buildPageMetadata } from '@/lib/seo/buildPageMetadata'
import CatalogPageClient from './CatalogPageClient'

const CATALOG_TITLE = 'Каталог ароматов и подарочной упаковки'
const CATALOG_DESCRIPTION =
  'Каталог бренда ВСПОМНИ: диффузоры, ароматические саше, интерьерные спреи и подарочные пакеты. Соберите личный набор или готовый подарок с доставкой по России.'

const CATALOG_KEYWORDS = [
  'каталог ВСПОМНИ',
  'каталог ароматов ВСПОМНИ',
  'каталог товаров ВСПОМНИ',
  'интернет-магазин ароматов для дома',
]

export const metadata: Metadata = buildPageMetadata({
  title: CATALOG_TITLE,
  description: CATALOG_DESCRIPTION,
  canonicalPath: '/catalog',
  keywords: CATALOG_KEYWORDS,
})

export const revalidate = 60

export default async function CatalogPage() {
  const [allProducts, categories] = await Promise.all([
    getCatalogAllProducts(500).catch(() => []),
    loadAllCategories(),
  ])

  return (
    <>
      <PublicPageBreadcrumbs
        items={breadcrumbCatalogPage()}
        currentPath="/catalog"
      />
      <CatalogPageClient
        allProducts={allProducts}
        initialCategories={categories}
      />
    </>
  )
}

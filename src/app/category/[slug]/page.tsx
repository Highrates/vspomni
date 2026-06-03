import type { Metadata } from 'next'
import PublicPageBreadcrumbs from '@/components/layout/PublicPageBreadcrumbs'
import { breadcrumbCatalog } from '@/lib/seo/breadcrumbItems'
import CategoryPageNoscript from '@/components/catalog/CategoryPageNoscript'
import { loadCategoryPage } from '@/lib/category/categoryPageLoader'
import { loadAllCategories } from '@/lib/category/loadAllCategories'
import { buildCategoryMetadata } from '@/lib/seo/categoryMetadata'
import { categoryItemListJsonLd } from '@/lib/seo/categoryJsonLd'
import CategoryPageClient from './CategoryPageClient'

export const revalidate = 60

type PageProps = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params
  const loaded = await loadCategoryPage(slug)
  if (!loaded) {
    return { title: 'Категория | ВСПОМНИ' }
  }
  return buildCategoryMetadata(
    loaded.name,
    loaded.canonicalPath,
    loaded.products.length,
  )
}

export default async function CategoryPage({ params }: PageProps) {
  const { slug } = await params
  const [loaded, allCategories] = await Promise.all([
    loadCategoryPage(slug),
    loadAllCategories(),
  ])

  if (!loaded) {
    return (
      <div className="px-4 py-12 text-center text-black/70">
        Категория не найдена
      </div>
    )
  }

  const { name: categoryLabel, products, hideAromas, canonicalPath } = loaded
  const jsonLd = categoryItemListJsonLd(
    categoryLabel,
    canonicalPath,
    products,
  )

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <CategoryPageNoscript
        categoryName={categoryLabel}
        products={products}
      />
      <PublicPageBreadcrumbs
        items={breadcrumbCatalog(categoryLabel)}
        currentPath={canonicalPath}
      />
      <CategoryPageClient
        slug={slug}
        initialCategoryTitle={categoryLabel}
        initialProducts={products}
        hideAromas={hideAromas}
        initialCategories={allCategories}
      />
    </>
  )
}

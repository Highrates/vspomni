import Breadcrumbs from '@/components/layout/Breadcrumbs'
import ProductPageClient from '@/components/product/ProductPageClient'
import { getCategoryMetaBySlug } from '@/graphql/queries/category.service'
import { getProductBreadcrumbMeta } from '@/graphql/queries/product.service'

export default async function CategoryProductPage({
  params,
}: {
  params: Promise<{ slug: string; productSlug: string }>
}) {
  const { slug, productSlug } = await params
  const [catMeta, productMeta] = await Promise.all([
    getCategoryMetaBySlug(slug),
    getProductBreadcrumbMeta(productSlug),
  ])

  const categoryLabel =
    catMeta?.name?.trim() ||
    productMeta?.categoryName?.trim() ||
    slug.replace(/-/g, ' ') ||
    'Категория'
  const productLabel =
    productMeta?.productName?.trim() || productSlug.replace(/-/g, ' ')

  const items = [
    { name: 'Главная', href: '/' },
    { name: 'Каталог', href: '/catalog' },
    { name: categoryLabel, href: `/category/${encodeURIComponent(slug)}` },
    { name: productLabel },
  ]

  const path = `/category/${encodeURIComponent(slug)}/${encodeURIComponent(productSlug)}`

  return (
    <>
      <div className="px-2 sm:px-4 pt-2 sm:pt-3 md:pt-4">
        <Breadcrumbs items={items} currentPath={path} />
      </div>
      <ProductPageClient
        productSlug={productSlug}
        expectedCategorySlug={slug}
      />
    </>
  )
}

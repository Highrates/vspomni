import { redirect } from 'next/navigation'
import Breadcrumbs from '@/components/layout/Breadcrumbs'
import {
  getProductBreadcrumbMeta,
  getProductCategorySlugForRedirect,
} from '@/graphql/queries/product.service'
import ProductPageClient from '@/components/product/ProductPageClient'

export default async function ProductLegacyPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const categorySlug = await getProductCategorySlugForRedirect(slug)
  if (categorySlug) {
    redirect(
      `/category/${encodeURIComponent(categorySlug)}/${encodeURIComponent(slug)}`,
    )
  }

  const meta = await getProductBreadcrumbMeta(slug)
  const productLabel =
    meta?.productName?.trim() || slug.replace(/-/g, ' ') || 'Товар'

  return (
    <>
      <div className="px-2 sm:px-4 pt-2 sm:pt-3 md:pt-4">
        <Breadcrumbs
          items={[{ name: 'Главная', href: '/' }, { name: productLabel }]}
          currentPath={`/product/${encodeURIComponent(slug)}`}
        />
      </div>
      <ProductPageClient productSlug={slug} />
    </>
  )
}

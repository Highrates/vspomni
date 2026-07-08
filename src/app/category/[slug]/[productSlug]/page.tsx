import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import PublicPageBreadcrumbs from '@/components/layout/PublicPageBreadcrumbs'
import { breadcrumbProduct } from '@/lib/seo/breadcrumbItems'
import ProductPageClient from '@/components/product/ProductPageClient'
import ProductPageNoscript from '@/components/product/ProductPageNoscript'
import { getCategoryMetaBySlug } from '@/graphql/queries/category.service'
import { getSingleProduct, getChoiceProducts } from '@/graphql/queries/product.service'
import { categoryProductPath, isValidSlug } from '@/lib/productPaths'
import { loadProductPageBySlug } from '@/lib/product/productPageLoader'
import { extractProductSeoContent } from '@/lib/product/productPageContent'
import { buildProductMetadata } from '@/lib/seo/productMetadata'
import { productJsonLdObject } from '@/lib/seo/productJsonLd'
import { categorySlugRedirectPath } from '@/lib/seo/categorySlugRedirects'

export const revalidate = 60

type PageProps = {
  params: Promise<{ slug: string; productSlug: string }>
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug, productSlug } = await params
  if (!isValidSlug(slug) || !isValidSlug(productSlug)) {
    return { title: 'Товар | ВСПОМНИ' }
  }
  const product = await getSingleProduct(productSlug)
  if (!product) {
    return { title: 'Товар | ВСПОМНИ' }
  }
  const path = categoryProductPath(slug, productSlug)
  if (!path) {
    return { title: 'Товар | ВСПОМНИ' }
  }
  return buildProductMetadata(product, path)
}

export default async function CategoryProductPage({ params }: PageProps) {
  const { slug, productSlug } = await params

  if (!isValidSlug(slug) || !isValidSlug(productSlug)) {
    notFound()
  }

  const redirectPath = categorySlugRedirectPath(slug, productSlug)
  if (redirectPath) redirect(redirectPath)

  const loaded = await loadProductPageBySlug(productSlug, slug)

  if (!loaded) {
    notFound()
  }

  const { product, canonicalPath } = loaded
  const [choiceProducts, catMeta] = await Promise.all([
    getChoiceProducts().catch(() => []),
    getCategoryMetaBySlug(slug),
  ])
  const seo = extractProductSeoContent(product)
  const jsonLd = productJsonLdObject(seo, canonicalPath)

  const categoryLabel =
    catMeta?.name?.trim() ||
    product.category?.name?.trim() ||
    slug.replace(/-/g, ' ') ||
    'Категория'

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ProductPageNoscript seo={seo} />
      <PublicPageBreadcrumbs
        items={breadcrumbProduct(categoryLabel, slug, product.name)}
        currentPath={canonicalPath}
      />
      <ProductPageClient
        productSlug={productSlug}
        expectedCategorySlug={slug}
        initialProduct={product}
        initialChoiceProducts={choiceProducts}
      />
    </>
  )
}

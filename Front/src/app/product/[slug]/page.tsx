import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import PublicPageBreadcrumbs from '@/components/layout/PublicPageBreadcrumbs'
import {
  BREADCRUMB_CATALOG,
  BREADCRUMB_HOME,
  breadcrumbProduct,
} from '@/lib/seo/breadcrumbItems'
import ProductPageClient from '@/components/product/ProductPageClient'
import ProductPageNoscript from '@/components/product/ProductPageNoscript'
import { getSingleProduct, getChoiceProducts } from '@/graphql/queries/product.service'
import { loadProductPageBySlug } from '@/lib/product/productPageLoader'
import { categoryProductPath, isValidSlug } from '@/lib/productPaths'
import { extractProductSeoContent } from '@/lib/product/productPageContent'
import { buildProductMetadata } from '@/lib/seo/productMetadata'
import { productJsonLdObject } from '@/lib/seo/productJsonLd'

export const revalidate = 60

type PageProps = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params
  if (!isValidSlug(slug)) {
    return { title: 'Товар | ВСПОМНИ' }
  }
  const product = await getSingleProduct(slug)
  if (!product) {
    return { title: 'Товар | ВСПОМНИ' }
  }
  const catSlug = product.category?.slug?.trim()
  const path =
    catSlug && isValidSlug(catSlug)
      ? categoryProductPath(catSlug, product.slug)
      : `/product/${encodeURIComponent(product.slug)}`
  if (!path) {
    return { title: 'Товар | ВСПОМНИ' }
  }
  return buildProductMetadata(product, path)
}

export default async function ProductLegacyPage({ params }: PageProps) {
  const { slug } = await params

  if (!isValidSlug(slug)) {
    notFound()
  }

  const loaded = await loadProductPageBySlug(slug)

  if (!loaded) {
    notFound()
  }

  const { product, canonicalPath } = loaded
  const choiceProducts = await getChoiceProducts().catch(() => [])
  const seo = extractProductSeoContent(product)
  const jsonLd = productJsonLdObject(seo, canonicalPath)

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ProductPageNoscript seo={seo} />
      <PublicPageBreadcrumbs
        items={
          product.category?.slug && product.category?.name
            ? breadcrumbProduct(
                product.category.name,
                product.category.slug,
                product.name,
              )
            : [BREADCRUMB_HOME, BREADCRUMB_CATALOG, { name: product.name }]
        }
        currentPath={canonicalPath}
      />
      <ProductPageClient
        productSlug={slug}
        initialProduct={product}
        initialChoiceProducts={choiceProducts}
      />
    </>
  )
}

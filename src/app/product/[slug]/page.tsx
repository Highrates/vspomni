import type { Metadata } from 'next'
import PublicPageBreadcrumbs from '@/components/layout/PublicPageBreadcrumbs'
import {
  BREADCRUMB_CATALOG,
  BREADCRUMB_HOME,
  breadcrumbProduct,
} from '@/lib/seo/breadcrumbItems'
import ProductPageClient from '@/components/product/ProductPageClient'
import ProductPageNoscript from '@/components/product/ProductPageNoscript'
import { getSingleProduct } from '@/graphql/queries/product.service'
import { loadProductPageBySlug } from '@/lib/product/productPageLoader'
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
  const product = await getSingleProduct(slug)
  if (!product) {
    return { title: 'Товар | ВСПОМНИ' }
  }
  const catSlug = product.category?.slug?.trim()
  const path = catSlug
    ? `/category/${encodeURIComponent(catSlug)}/${encodeURIComponent(product.slug)}`
    : `/product/${encodeURIComponent(product.slug)}`
  return buildProductMetadata(product, path)
}

export default async function ProductLegacyPage({ params }: PageProps) {
  const { slug } = await params
  const loaded = await loadProductPageBySlug(slug)

  if (!loaded) {
    return (
      <div className="px-4 py-12 text-center text-black/70">
        Товар не найден
      </div>
    )
  }

  const { product, canonicalPath } = loaded
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
      <ProductPageClient productSlug={slug} initialProduct={product} />
    </>
  )
}

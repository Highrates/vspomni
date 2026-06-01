import type { Metadata } from 'next'
import Breadcrumbs from '@/components/layout/Breadcrumbs'
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
      <div className="px-2 sm:px-4 pt-2 sm:pt-3 md:pt-4">
        <Breadcrumbs
          items={[{ name: 'Главная', href: '/' }, { name: product.name }]}
          currentPath={canonicalPath}
        />
      </div>
      <ProductPageClient productSlug={slug} initialProduct={product} />
    </>
  )
}

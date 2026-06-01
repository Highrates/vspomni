import type { Metadata } from 'next'
import Breadcrumbs from '@/components/layout/Breadcrumbs'
import ProductPageClient from '@/components/product/ProductPageClient'
import ProductPageNoscript from '@/components/product/ProductPageNoscript'
import { getCategoryMetaBySlug } from '@/graphql/queries/category.service'
import { getSingleProduct } from '@/graphql/queries/product.service'
import { loadProductPageBySlug } from '@/lib/product/productPageLoader'
import { extractProductSeoContent } from '@/lib/product/productPageContent'
import { buildProductMetadata } from '@/lib/seo/productMetadata'
import { productJsonLdObject } from '@/lib/seo/productJsonLd'

export const revalidate = 60

type PageProps = {
  params: Promise<{ slug: string; productSlug: string }>
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug, productSlug } = await params
  const product = await getSingleProduct(productSlug)
  if (!product) {
    return { title: 'Товар | ВСПОМНИ' }
  }
  const catSlug = product.category?.slug?.trim() || slug
  const path = `/category/${encodeURIComponent(catSlug)}/${encodeURIComponent(product.slug)}`
  return buildProductMetadata(product, path)
}

export default async function CategoryProductPage({ params }: PageProps) {
  const { slug, productSlug } = await params
  const loaded = await loadProductPageBySlug(productSlug, slug)

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

  const [catMeta] = await Promise.all([getCategoryMetaBySlug(slug)])

  const categoryLabel =
    catMeta?.name?.trim() ||
    product.category?.name?.trim() ||
    slug.replace(/-/g, ' ') ||
    'Категория'

  const items = [
    { name: 'Главная', href: '/' },
    { name: 'Каталог', href: '/catalog' },
    { name: categoryLabel, href: `/category/${encodeURIComponent(slug)}` },
    { name: product.name },
  ]

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ProductPageNoscript seo={seo} />
      <div className="px-2 sm:px-4 pt-2 sm:pt-3 md:pt-4">
        <Breadcrumbs items={items} currentPath={canonicalPath} />
      </div>
      <ProductPageClient
        productSlug={productSlug}
        expectedCategorySlug={slug}
        initialProduct={product}
      />
    </>
  )
}

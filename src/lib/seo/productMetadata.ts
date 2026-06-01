import type { Metadata } from 'next'
import type { ProductDetailNode } from '@/graphql/types/product.types'
import { absoluteUrl } from '@/lib/siteUrl'
import {
  extractProductSeoContent,
  productMetaDescription,
} from '@/lib/product/productPageContent'

export function buildProductMetadata(
  product: ProductDetailNode,
  canonicalPath: string,
): Metadata {
  const seo = extractProductSeoContent(product)
  const description = productMetaDescription(seo)
  const url = absoluteUrl(canonicalPath)

  return {
    title: `${seo.name} | ВСПОМНИ`,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: seo.name,
      description,
      url,
      type: 'website',
      images: seo.imageUrls[0] ? [{ url: seo.imageUrls[0] }] : undefined,
    },
  }
}

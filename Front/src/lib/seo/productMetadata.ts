import type { Metadata } from 'next'
import type { ProductDetailNode } from '@/graphql/types/product.types'
import {
  extractProductSeoContent,
  productMetaDescription,
} from '@/lib/product/productPageContent'
import { buildPageMetadata } from '@/lib/seo/buildPageMetadata'

export function buildProductMetadata(
  product: ProductDetailNode,
  canonicalPath: string,
): Metadata {
  const seo = extractProductSeoContent(product)
  const description = productMetaDescription(seo)

  return buildPageMetadata({
    title: seo.name,
    description,
    canonicalPath,
    ogImage: seo.imageUrls[0] ?? null,
  })
}

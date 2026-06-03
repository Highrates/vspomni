import { redirect } from 'next/navigation'
import {
  getSingleProduct,
  getProductCategorySlugForRedirect,
} from '@/graphql/queries/product.service'
import type { ProductDetailNode } from '@/graphql/types/product.types'
import { categoryProductPath, isValidSlug } from '@/lib/productPaths'

export type LoadedProductPage = {
  product: ProductDetailNode
  categorySlug: string | null
  canonicalPath: string
}

export async function loadProductPageBySlug(
  productSlug: string,
  expectedCategorySlug?: string,
): Promise<LoadedProductPage | null> {
  if (!isValidSlug(productSlug)) return null

  const product = await getSingleProduct(productSlug)
  if (!product?.slug || !isValidSlug(product.slug)) return null

  const saleorCategorySlug = product.category?.slug?.trim() || null

  // /category/{cat}/{slug} — canonical и JSON-LD всегда на текущий URL (не на «основную» категорию Saleor)
  if (expectedCategorySlug) {
    if (!isValidSlug(expectedCategorySlug)) return null
    const canonicalPath = categoryProductPath(
      expectedCategorySlug,
      productSlug,
    )
    if (!canonicalPath) return null
    return {
      product,
      categorySlug: expectedCategorySlug,
      canonicalPath,
    }
  }

  const redirectSlug = await getProductCategorySlugForRedirect(productSlug)
  if (redirectSlug) {
    const redirectPath = categoryProductPath(redirectSlug, product.slug)
    if (redirectPath) redirect(redirectPath)
  }

  const categorySlug = saleorCategorySlug || null
  const canonicalPath = categorySlug
    ? categoryProductPath(categorySlug, product.slug)
    : `/product/${encodeURIComponent(product.slug)}`

  if (!canonicalPath) return null

  return { product, categorySlug, canonicalPath }
}

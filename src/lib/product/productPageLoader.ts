import { redirect } from 'next/navigation'
import {
  getSingleProduct,
  getProductCategorySlugForRedirect,
} from '@/graphql/queries/product.service'
import type { ProductDetailNode } from '@/graphql/types/product.types'

export type LoadedProductPage = {
  product: ProductDetailNode
  categorySlug: string | null
  canonicalPath: string
}

export async function loadProductPageBySlug(
  productSlug: string,
  expectedCategorySlug?: string,
): Promise<LoadedProductPage | null> {
  const product = await getSingleProduct(productSlug)
  if (!product) return null

  const saleorCategorySlug = product.category?.slug?.trim() || null

  if (
    saleorCategorySlug &&
    expectedCategorySlug &&
    saleorCategorySlug !== expectedCategorySlug
  ) {
    redirect(
      `/category/${encodeURIComponent(saleorCategorySlug)}/${encodeURIComponent(product.slug)}`,
    )
  }

  if (!expectedCategorySlug) {
    const redirectSlug = await getProductCategorySlugForRedirect(productSlug)
    if (redirectSlug) {
      redirect(
        `/category/${encodeURIComponent(redirectSlug)}/${encodeURIComponent(product.slug)}`,
      )
    }
  }

  const categorySlug = saleorCategorySlug || expectedCategorySlug || null
  const canonicalPath = categorySlug
    ? `/category/${encodeURIComponent(categorySlug)}/${encodeURIComponent(product.slug)}`
    : `/product/${encodeURIComponent(product.slug)}`

  return { product, categorySlug, canonicalPath }
}

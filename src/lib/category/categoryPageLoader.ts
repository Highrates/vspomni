import { cache } from 'react'
import { getCategoryMetaBySlug } from '@/graphql/queries/category.service'
import { getProductsByCategorySlug } from '@/graphql/queries/product.service'
import type { ProductCardItem } from '@/types/product'

export type LoadedCategoryPage = {
  slug: string
  name: string
  products: ProductCardItem[]
  hideAromas: boolean
  canonicalPath: string
}

export async function fetchCategoryProductsSafe(
  slug: string,
): Promise<ProductCardItem[]> {
  try {
    const products = await getProductsByCategorySlug(slug)
    return Array.isArray(products) ? products : []
  } catch (error) {
    console.error('fetchCategoryProductsSafe:', error)
    return []
  }
}

export const loadCategoryPage = cache(async (
  slug: string,
): Promise<LoadedCategoryPage | null> => {
  const [meta, products] = await Promise.all([
    getCategoryMetaBySlug(slug),
    fetchCategoryProductsSafe(slug),
  ])

  const name = meta?.name?.trim() || slug.replace(/-/g, ' ') || 'Категория'
  const nameLower = name.toLowerCase()

  const hideAromas =
    nameLower === 'подарочные пакеты' || slug === 'podarochnye-pakety'

  return {
    slug,
    name,
    products,
    hideAromas,
    canonicalPath: `/category/${encodeURIComponent(slug)}`,
  }
})

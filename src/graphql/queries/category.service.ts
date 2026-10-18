import { fetchCategories, fetchProductList, cardToProductCardItem, type NestCategory } from '@/api/catalogApi'
import { uploadsUrl } from '@/api/apiClient'
import type { SingleCategoryConnection } from '@/graphql/types/category.types'
import type { Category } from '@/types/category'
import {
  GIFT_PACKAGES_CATEGORY_ID,
  GIFT_PACKAGES_CATEGORY_SLUG,
  pickComingSoonCategories,
} from '@/lib/category/catalogCategories'
import { stripHtml } from '@/lib/nestContent'

function mapCategory(c: NestCategory): Category {
  return {
    id: c.id,
    name: c.name,
    slug: c.slug,
    description: stripHtml(c.description ?? ''),
    backgroundImage: uploadsUrl(c.imageUrl) || '',
  }
}

function flatten(items: NestCategory[]): NestCategory[] {
  const out: NestCategory[] = []
  for (const c of items) {
    out.push(c)
    if (c.children?.length) out.push(...flatten(c.children))
  }
  return out
}

/** Nest `GET /catalog/categories` (все уровни, плоским списком). */
export async function getAllCategory(first: number): Promise<Category[]> {
  const { items } = await fetchCategories()
  return flatten(items).slice(0, first).map(mapCategory)
}

/** Только корневые категории (для меню). */
export async function getAllCategorMenu(): Promise<any[]> {
  const { items } = await fetchCategories()
  return items
    .filter((c) => !c.parentId)
    .map((c) => ({ id: c.id, name: c.name, slug: c.slug, parent: null }))
}

/** Категория + её товары (формат Saleor `SingleCategory`, поля товаров — минимальные). */
export async function getSingleCategory(
  first: number,
  slug: string,
): Promise<SingleCategoryConnection['category']> {
  const { items } = await fetchCategories()
  const cat = flatten(items).find((c) => c.slug === slug)
  const list = await fetchProductList({ category: slug, limit: first, page: 1 })
  const cards = (list.items ?? []).map((c) => cardToProductCardItem(c, { categorySlug: slug }))
  return {
    id: cat?.id ?? '',
    description: cat?.description ?? '',
    metadata: [],
    name: cat?.name ?? '',
    slug,
    products: {
      pageInfo: { hasNextPage: (list.total ?? 0) > first, hasPreviousPage: false },
      totalCount: list.total ?? cards.length,
      edges: cards.map((p) => ({
        node: {
          description: '',
          id: p.id,
          isAvailableForPurchase: p.inStock !== false,
          media: (p.gallery ?? []).map((url) => ({ alt: p.name, url })),
          name: p.name,
          pricing: {
            discount: {
              gross: {
                fractionalAmount: 0,
                amount: p.oldPrice ? p.oldPrice - p.price : 0,
                currency: 'RUB',
              },
            },
          },
          slug: p.slug,
          thumbnail: { alt: p.name, url: p.thumbnail },
          weight: { unit: 'kg', value: p.weight ?? 0 },
          category: { name: cat?.name ?? '', slug },
        },
      })),
    },
  }
}

/** «Скоро» — выбираются по Saleor-ID (COMING_SOON_CATEGORY_IDS); в Nest-данных id другие → пусто, без падения. */
export async function getComingSoonCategories(): Promise<Category[]> {
  try {
    const allCategories = await getAllCategory(100)
    return pickComingSoonCategories(allCategories)
  } catch (error) {
    console.error('Error fetching coming soon categories:', error)
    return []
  }
}

/**
 * Категория по ID. Для баннера «Подарочные пакеты» старый Saleor GID
 * (`GIFT_PACKAGES_CATEGORY_ID`) резолвится в категорию со slug `podarochnye-pakety`.
 */
export async function getCategoryById(id: string): Promise<Category | null> {
  try {
    const all = await getAllCategory(200)
    const byId = all.find((c) => c.id === id)
    if (byId) return byId
    if (id === GIFT_PACKAGES_CATEGORY_ID) {
      return all.find((c) => c.slug === GIFT_PACKAGES_CATEGORY_SLUG) ?? null
    }
    return null
  } catch (e) {
    console.error('getCategoryById error:', e)
    return null
  }
}

/** Имя и slug категории по slug (для заголовка страницы, без зависимости от zustand) */
export async function getCategoryMetaBySlug(
  slug: string,
): Promise<{ name: string; slug: string } | null> {
  try {
    const all = await getAllCategory(200)
    const c = all.find((x) => x.slug === slug)
    if (!c?.name || !c?.slug) return null
    return { name: c.name, slug: c.slug }
  } catch {
    return null
  }
}

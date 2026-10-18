import { uploadsUrl } from '@/api/apiClient'
import { fetchCatalogTags, type CatalogTagPublic } from '@/api/catalogApi'

export interface AllAromasItem {
  id: string
  slug: string
  title: string
  text: string
  image: string
  /** Описание аромата (plain / HTML из Nest CatalogTagStep) */
  content?: string | null
  publishedAt?: string | null
}

/** Заголовок как на /catalog/aroma/[slug]: title → text → slug */
export function getAromaDisplayTitle(
  item: Pick<AllAromasItem, 'title' | 'text' | 'slug'>,
): string {
  return (
    item.title?.trim() ||
    item.text?.trim() ||
    item.slug.replace(/-/g, ' ')
  )
}

function mapTagToAroma(tag: CatalogTagPublic): AllAromasItem {
  return {
    id: tag.id,
    slug: tag.slug,
    title: tag.title?.trim() || tag.name,
    // `text` в Saleor-версии — имя аромата для фильтра по значению атрибута
    text: tag.name,
    image: uploadsUrl(tag.coverImageUrl) || '',
    content: tag.description?.trim() || null,
    publishedAt: null,
  }
}

/** Nest `GET /catalog/tags` → список «Все ароматы». */
export async function getAllAromas(): Promise<AllAromasItem[]> {
  const { items } = await fetchCatalogTags()
  return [...items]
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .map(mapTagToAroma)
}

/** Заголовок страницы аромата для крошек (по slug тега) */
export async function getAromaBreadcrumbTitleBySlug(
  slug: string,
): Promise<string | null> {
  const list = await getAllAromas()
  const item = list.find((a) => a.slug === slug)
  if (!item) return null
  return getAromaDisplayTitle(item) || null
}

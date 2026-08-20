import { cache } from 'react'
import {
  getAllAromas,
  getAromaDisplayTitle,
  type AllAromasItem,
} from '@/graphql/queries/allAromas.service'
import {
  getProductsByAromaSlug,
  getProductsByAromaValue,
} from '@/graphql/queries/product.service'
import { extractArticleText } from '@/lib/articles'
import { buildPageMetadata } from '@/lib/seo/buildPageMetadata'
import type { Metadata } from 'next'
import type { ProductCardItem } from '@/types/product'
import { editorJsToPlainText } from '@/lib/product/productPageContent'

export const getAromaBySlug = cache(
  async (slug: string): Promise<AllAromasItem | null> => {
    const list = await getAllAromas()
    return list.find((a) => a.slug === slug) ?? null
  },
)

/** Товары аромата — один запрос для SSR и клиента */
export const getAromaProducts = cache(
  async (aroma: AllAromasItem): Promise<ProductCardItem[]> => {
    const nameForFilter = aroma.text?.trim() || aroma.title?.trim() || ''
    let list = await getProductsByAromaSlug(aroma.slug)
    if (list.length === 0 && nameForFilter) {
      list = await getProductsByAromaValue(nameForFilter)
    }
    return list
  },
)

export function aromaPlainDescription(aroma: AllAromasItem): string {
  const fromContent = aroma.content
    ? extractArticleText(aroma.content, 400) ||
      editorJsToPlainText(aroma.content)
    : ''
  return (fromContent || aroma.text?.trim() || '').replace(/\s+/g, ' ').trim()
}

export async function buildAromaMetadata(slug: string): Promise<Metadata> {
  const aroma = await getAromaBySlug(slug)
  const displayTitle =
    (aroma && getAromaDisplayTitle(aroma)) ||
    slug.replace(/-/g, ' ') ||
    'Аромат'

  const path = `/catalog/aroma/${encodeURIComponent(slug)}`
  const fromContent = aroma?.content
    ? extractArticleText(aroma.content, 160)
    : ''
  const description =
    fromContent ||
    aroma?.text?.trim() ||
    `Товары с ароматом «${displayTitle}» в каталоге ВСПОМНИ — диффузоры, саше и подарочные наборы.`

  return buildPageMetadata({
    title: `${displayTitle} — ароматы`,
    description,
    canonicalPath: path,
    ogImage: aroma?.image ?? null,
  })
}

import { cache } from 'react'
import {
  getAllAromas,
  getAromaDisplayTitle,
  type AllAromasItem,
} from '@/graphql/queries/allAromas.service'
import { extractArticleText } from '@/lib/articles'
import { buildPageMetadata } from '@/lib/seo/buildPageMetadata'
import type { Metadata } from 'next'

export const getAromaBySlug = cache(async (slug: string): Promise<AllAromasItem | null> => {
  const list = await getAllAromas()
  return list.find((a) => a.slug === slug) ?? null
})

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

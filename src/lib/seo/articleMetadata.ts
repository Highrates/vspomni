import type { Metadata } from 'next'
import type { ArticleNode } from '@/graphql/queries/articles.service'
import { extractArticleText } from '@/lib/articles'
import { buildPageMetadata } from '@/lib/seo/buildPageMetadata'

function articleDescription(article: ArticleNode): string {
  const fromContent = extractArticleText(
    article.osnovnojTekst || article.content,
    160,
  )
  if (fromContent) return fromContent
  return `${article.title.trim()} — материалы бренда ВСПОМНИ об ароматах для дома и подарках.`
}

export function buildArticleMetadata(
  article: ArticleNode,
  slug: string,
): Metadata {
  const path = `/article/${encodeURIComponent(slug)}`
  return buildPageMetadata({
    title: article.title.trim(),
    description: articleDescription(article),
    canonicalPath: path,
    ogImage: article.imageUrl ?? null,
  })
}

import { absoluteUrl } from '@/lib/siteUrl'
import type { ArticleNode } from '@/graphql/queries/articles.service'

export function articleJsonLdObject(article: ArticleNode, pagePath: string) {
  const url = absoluteUrl(pagePath)
  const published = article.publishedAt || article.created

  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title.trim(),
    url,
    datePublished: published || undefined,
    dateModified: published || undefined,
    image: article.imageUrl ? [article.imageUrl] : undefined,
    author: {
      '@type': 'Organization',
      name: 'ВСПОМНИ',
    },
    publisher: {
      '@type': 'Organization',
      name: 'ВСПОМНИ',
    },
  }
}

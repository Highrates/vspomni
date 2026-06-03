import type { ArticleNode } from '@/graphql/queries/articles.service'
import { extractArticleText, formatArticleDate } from '@/lib/articles'

export type NewsListItem = {
  id: string
  slug: string
  title: string
  date: string
  shortText: string
  imageUrl: string
  articleUrl: string
}

export function mapArticleToNewsListItem(article: ArticleNode): NewsListItem {
  const shortText =
    extractArticleText(article.content, 150) ||
    extractArticleText(article.osnovnojTekst, 150) ||
    ''

  return {
    id: article.id,
    slug: article.slug,
    title: article.title.trim(),
    date: formatArticleDate(article.publishedAt || article.created),
    shortText,
    imageUrl: article.imageUrl?.trim() || '',
    articleUrl: `/article/${encodeURIComponent(article.slug)}`,
  }
}

export function mapArticlesToNewsList(articles: ArticleNode[]): NewsListItem[] {
  return articles.map(mapArticleToNewsListItem)
}

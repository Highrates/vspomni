import type { Metadata } from 'next'
import NewsPageNoscript from '@/components/news/NewsPageNoscript'
import PublicPageBreadcrumbs from '@/components/layout/PublicPageBreadcrumbs'
import { getAllArticles } from '@/graphql/queries/articles.service'
import { mapArticlesToNewsList } from '@/lib/articles/newsList'
import { breadcrumbNews } from '@/lib/seo/breadcrumbItems'
import { buildPageMetadata } from '@/lib/seo/buildPageMetadata'
import NewsPageClient from './NewsPageClient'

export const metadata: Metadata = buildPageMetadata({
  title: 'Новости и публикации',
  description:
    'Новости бренда ВСПОМНИ: анонсы коллекций, события, полезные материалы об интерьерных ароматах и подарочных наборах.',
  canonicalPath: '/news',
  keywords: ['новости ВСПОМНИ', 'блог ВСПОМНИ', 'публикации ВСПОМНИ'],
})

export const revalidate = 60

export default async function NewsPage() {
  const articles = await getAllArticles(20).catch(() => [])
  const listItems = mapArticlesToNewsList(articles)

  return (
    <>
      <NewsPageNoscript items={listItems} />
      <PublicPageBreadcrumbs
        items={breadcrumbNews()}
        currentPath="/news"
        variant="container"
      />
      <NewsPageClient initialArticles={articles} />
    </>
  )
}

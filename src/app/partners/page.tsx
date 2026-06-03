import type { Metadata } from 'next'
import PublicPageBreadcrumbs from '@/components/layout/PublicPageBreadcrumbs'
import { getSingleArticle } from '@/graphql/queries/articles.service'
import { extractArticleText } from '@/lib/articles'
import { breadcrumbSimple } from '@/lib/seo/breadcrumbItems'
import { buildPageMetadata } from '@/lib/seo/buildPageMetadata'
import PartnersPageClient from './PartnersPageClient'

const PARTNERS_SLUG = 'kak-stat-partnerom'

export const revalidate = 60

export async function generateMetadata(): Promise<Metadata> {
  const article = await getSingleArticle(PARTNERS_SLUG).catch(() => null)
  const title = article?.title?.trim() || 'Партнёрам'
  const description =
    extractArticleText(article?.osnovnojTekst || article?.content, 160) ||
    'Сотрудничество с брендом ВСПОМНИ: оптовые продажи, партнёрские программы и условия для ритейла и корпоративных клиентов.'

  return buildPageMetadata({
    title,
    description,
    canonicalPath: '/partners',
    ogImage: article?.imageUrl ?? null,
  })
}

export default async function PartnersPage() {
  const article = await getSingleArticle(PARTNERS_SLUG).catch(() => null)
  const label = article?.title?.trim() || 'Партнёрам'

  return (
    <>
      <PublicPageBreadcrumbs
        items={breadcrumbSimple(label)}
        currentPath="/partners"
        variant="article"
      />
      <PartnersPageClient />
    </>
  )
}

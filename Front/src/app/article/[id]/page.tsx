import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import ArticlePageNoscript from '@/components/article/ArticlePageNoscript'
import PublicPageBreadcrumbs from '@/components/layout/PublicPageBreadcrumbs'
import { loadArticleBySlug } from '@/lib/article/articlePageLoader'
import { breadcrumbArticle } from '@/lib/seo/breadcrumbItems'
import { buildArticleMetadata } from '@/lib/seo/articleMetadata'
import { articleJsonLdObject } from '@/lib/seo/articleJsonLd'
import ArticlePageClient from './ArticlePageClient'

export const revalidate = 60

type PageProps = {
  params: Promise<{ id: string }>
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params
  const article = await loadArticleBySlug(id)
  if (!article?.title?.trim()) {
    return { title: 'Статья | ВСПОМНИ' }
  }
  return buildArticleMetadata(article, id)
}

export default async function ArticlePage({ params }: PageProps) {
  const { id } = await params
  const article = await loadArticleBySlug(id).catch(() => null)

  if (!article) {
    notFound()
  }

  const label = article.title.trim()
  const path = `/article/${encodeURIComponent(id)}`
  const jsonLd = articleJsonLdObject(article, path)

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ArticlePageNoscript article={article} />
      <PublicPageBreadcrumbs
        items={breadcrumbArticle(label)}
        currentPath={path}
        variant="article"
      />
      <ArticlePageClient slug={id} initialArticle={article} />
    </>
  )
}

import Breadcrumbs from '@/components/layout/Breadcrumbs'
import { getSingleArticle } from '@/graphql/queries/articles.service'
import ArticlePageClient from './ArticlePageClient'

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const article = await getSingleArticle(id).catch(() => null)
  const label = article?.title?.trim() || 'Статья'

  return (
    <>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-0 pt-4">
        <Breadcrumbs
          items={[{ name: 'Главная', href: '/' }, { name: label }]}
          currentPath={`/article/${encodeURIComponent(id)}`}
        />
      </div>
      <ArticlePageClient slug={id} />
    </>
  )
}

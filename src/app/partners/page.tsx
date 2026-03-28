import Breadcrumbs from '@/components/layout/Breadcrumbs'
import { getSingleArticle } from '@/graphql/queries/articles.service'
import PartnersPageClient from './PartnersPageClient'

export default async function PartnersPage() {
  const article = await getSingleArticle('kak-stat-partnerom').catch(() => null)
  const label = article?.title?.trim() || 'Партнёрам'

  return (
    <>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-0 pt-4">
        <Breadcrumbs
          items={[{ name: 'Главная', href: '/' }, { name: label }]}
          currentPath="/partners"
        />
      </div>
      <PartnersPageClient />
    </>
  )
}

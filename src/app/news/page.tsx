import Breadcrumbs from '@/components/layout/Breadcrumbs'
import NewsPageClient from './NewsPageClient'

export default function NewsPage() {
  return (
    <>
      <div className="px-3 sm:px-4 md:px-0 pt-4">
        <div className="container">
          <Breadcrumbs
            items={[{ name: 'Главная', href: '/' }, { name: 'Новости' }]}
            currentPath="/news"
          />
        </div>
      </div>
      <NewsPageClient />
    </>
  )
}

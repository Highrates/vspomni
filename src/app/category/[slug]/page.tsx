import Breadcrumbs from '@/components/layout/Breadcrumbs'
import { getCategoryMetaBySlug } from '@/graphql/queries/category.service'
import CategoryPageClient from './CategoryPageClient'

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const meta = await getCategoryMetaBySlug(slug)
  const categoryLabel =
    meta?.name?.trim() || slug.replace(/-/g, ' ') || 'Категория'

  const items = [
    { name: 'Главная', href: '/' },
    { name: 'Каталог', href: '/catalog' },
    { name: categoryLabel },
  ]

  return (
    <>
      <div className="px-2 sm:px-4 pt-2 sm:pt-3 md:pt-4">
        <Breadcrumbs
          items={items}
          currentPath={`/category/${encodeURIComponent(slug)}`}
        />
      </div>
      <CategoryPageClient
        slug={slug}
        initialCategoryTitle={meta?.name?.trim() || ''}
      />
    </>
  )
}

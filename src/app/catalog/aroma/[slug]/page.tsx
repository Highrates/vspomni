import Breadcrumbs from '@/components/layout/Breadcrumbs'
import { getAromaBreadcrumbTitleBySlug } from '@/graphql/queries/allAromas.service'
import CatalogAromaPageClient from './CatalogAromaPageClient'

export default async function CatalogAromaPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const aromaTitle =
    (await getAromaBreadcrumbTitleBySlug(slug))?.trim() ||
    slug.replace(/-/g, ' ')

  const items = [
    { name: 'Главная', href: '/' },
    { name: 'Каталог', href: '/catalog' },
    { name: 'Ароматы', href: '/#vse-aromaty' },
    { name: aromaTitle },
  ]

  return (
    <>
      <div className="px-2 sm:px-4 pt-2 sm:pt-3 md:pt-4">
        <Breadcrumbs
          items={items}
          currentPath={`/catalog/aroma/${encodeURIComponent(slug)}`}
        />
      </div>
      <CatalogAromaPageClient slug={slug} />
    </>
  )
}

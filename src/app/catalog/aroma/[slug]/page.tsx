import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import PublicPageBreadcrumbs from '@/components/layout/PublicPageBreadcrumbs'
import { getAromaDisplayTitle } from '@/graphql/queries/allAromas.service'
import { breadcrumbAroma } from '@/lib/seo/breadcrumbItems'
import { buildAromaMetadata, getAromaBySlug } from '@/lib/seo/aromaMetadata'
import CatalogAromaPageClient from './CatalogAromaPageClient'

export const revalidate = 60

type PageProps = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params
  return buildAromaMetadata(slug)
}

export default async function CatalogAromaPage({ params }: PageProps) {
  const { slug } = await params
  const aroma = await getAromaBySlug(slug)

  if (!aroma) {
    notFound()
  }

  const aromaTitle = getAromaDisplayTitle(aroma)
  const path = `/catalog/aroma/${encodeURIComponent(slug)}`

  return (
    <>
      <PublicPageBreadcrumbs
        items={breadcrumbAroma(aromaTitle)}
        currentPath={path}
      />
      <CatalogAromaPageClient slug={slug} />
    </>
  )
}

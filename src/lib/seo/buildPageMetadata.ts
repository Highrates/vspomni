import type { Metadata } from 'next'
import { absoluteUrl } from '@/lib/siteUrl'

export type PageMetadataInput = {
  title: string
  description: string
  canonicalPath: string
  keywords?: string[]
  ogImage?: string | null
  noIndex?: boolean
}

/** Единый формат title, description, canonical и Open Graph для публичных страниц */
export function buildPageMetadata({
  title,
  description,
  canonicalPath,
  keywords,
  ogImage,
  noIndex = false,
}: PageMetadataInput): Metadata {
  const url = absoluteUrl(canonicalPath)
  const fullTitle = title.includes('ВСПОМНИ') ? title : `${title} | ВСПОМНИ`

  return {
    title: fullTitle,
    description,
    ...(keywords?.length ? { keywords } : {}),
    alternates: { canonical: url },
    robots: noIndex ? { index: false, follow: false } : undefined,
    openGraph: {
      title: fullTitle,
      description,
      url,
      siteName: 'ВСПОМНИ',
      locale: 'ru_RU',
      type: 'website',
      ...(ogImage ? { images: [{ url: ogImage }] } : {}),
    },
  }
}

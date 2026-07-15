import type { Metadata } from 'next'
import { absoluteUrl } from '@/lib/siteUrl'

/** Превью для Telegram/WhatsApp, если у страницы нет своей картинки */
export const DEFAULT_OG_IMAGE = '/images/catalogTop.png'

export type PageMetadataInput = {
  title: string
  description: string
  canonicalPath: string
  ogImage?: string | null
  noIndex?: boolean
}

function resolveOgImage(ogImage?: string | null): string {
  const raw = ogImage?.trim()
  if (!raw) return absoluteUrl(DEFAULT_OG_IMAGE)
  if (/^https?:\/\//i.test(raw)) return raw
  return absoluteUrl(raw)
}

/** Единый формат title, description, canonical и Open Graph для публичных страниц */
export function buildPageMetadata({
  title,
  description,
  canonicalPath,
  ogImage,
  noIndex = false,
}: PageMetadataInput): Metadata {
  const url = absoluteUrl(canonicalPath)
  const fullTitle = title.includes('ВСПОМНИ') ? title : `${title} | ВСПОМНИ`
  const imageUrl = resolveOgImage(ogImage)

  return {
    title: fullTitle,
    description,
    alternates: { canonical: url },
    robots: noIndex ? { index: false, follow: false } : undefined,
    openGraph: {
      title: fullTitle,
      description,
      url,
      siteName: 'ВСПОМНИ',
      locale: 'ru_RU',
      type: 'website',
      images: [
        {
          url: imageUrl,
          alt: fullTitle,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
      images: [imageUrl],
    },
  }
}

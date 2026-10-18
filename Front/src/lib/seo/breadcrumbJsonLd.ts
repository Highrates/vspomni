import { absoluteUrl } from '@/lib/siteUrl'

export type BreadcrumbItemInput = { name: string; href?: string }

/**
 * Schema.org BreadcrumbList (JSON-LD).
 * `currentPath` — путь текущей страницы (для последнего пункта в item).
 */
export function breadcrumbJsonLdObject(
  items: BreadcrumbItemInput[],
  currentPath: string,
) {
  const path =
    currentPath.startsWith('/') ? currentPath : `/${currentPath}`

  const itemListElement = items.map((it, index) => {
    const position = index + 1
    const isLast = index === items.length - 1
    const itemUrl = isLast
      ? absoluteUrl(path)
      : it.href
        ? absoluteUrl(it.href)
        : absoluteUrl('/')

    return {
      '@type': 'ListItem',
      position,
      name: it.name,
      item: itemUrl,
    }
  })

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement,
  }
}

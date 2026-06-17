import {
  CATALOG_DESCRIPTION,
  CATALOG_TITLE,
} from '@/lib/catalog/catalogPageContent'
import { productDetailPath } from '@/lib/productPaths'
import { absoluteUrl } from '@/lib/siteUrl'
import type { Category } from '@/types/category'
import type { ProductCardItem } from '@/types/product'

export function catalogPageJsonLd(
  categories: Category[],
  products: ProductCardItem[],
) {
  const categoryItems = categories.map((category, index) => ({
    '@type': 'ListItem' as const,
    position: index + 1,
    name: category.name,
    url: absoluteUrl(`/category/${encodeURIComponent(category.slug)}`),
  }))

  const productOffset = categoryItems.length
  const productItems = products.flatMap((product, index) => {
    const path = productDetailPath(product)
    if (!path) return []
    return [
      {
        '@type': 'ListItem' as const,
        position: productOffset + index + 1,
        name: product.name,
        url: absoluteUrl(path),
      },
    ]
  })

  const itemListElement = [...categoryItems, ...productItems]

  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: CATALOG_TITLE,
    description: CATALOG_DESCRIPTION,
    url: absoluteUrl('/catalog'),
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: itemListElement.length,
      itemListElement,
    },
  }
}

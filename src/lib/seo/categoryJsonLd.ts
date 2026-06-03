import { absoluteUrl } from '@/lib/siteUrl'
import { productDetailPath } from '@/lib/productPaths'
import type { ProductCardItem } from '@/types/product'

export function categoryItemListJsonLd(
  categoryName: string,
  categoryPath: string,
  products: ProductCardItem[],
) {
  const itemListElement = products.flatMap((product, index) => {
    const path = productDetailPath(product)
    if (!path) return []
    return [
      {
        '@type': 'ListItem' as const,
        position: index + 1,
        name: product.name,
        url: absoluteUrl(path),
      },
    ]
  })

  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: categoryName,
    url: absoluteUrl(categoryPath),
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: itemListElement.length,
      itemListElement,
    },
  }
}

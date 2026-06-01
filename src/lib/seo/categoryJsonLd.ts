import { absoluteUrl } from '@/lib/siteUrl'
import { productDetailPath } from '@/lib/productPaths'
import type { ProductCardItem } from '@/types/product'

export function categoryItemListJsonLd(
  categoryName: string,
  categoryPath: string,
  products: ProductCardItem[],
) {
  const itemListElement = products.map((product, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: product.name,
    url: absoluteUrl(productDetailPath(product)),
  }))

  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: categoryName,
    url: absoluteUrl(categoryPath),
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: products.length,
      itemListElement,
    },
  }
}

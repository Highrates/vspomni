import { absoluteUrl } from '@/lib/siteUrl'
import type { ProductSeoContent } from '@/lib/product/productPageContent'

export function productJsonLdObject(
  seo: ProductSeoContent,
  pagePath: string,
) {
  const url = absoluteUrl(pagePath)
  const description =
    [seo.shortDescription, seo.descriptionPlain].filter(Boolean).join(' ') ||
    seo.name

  const offer =
    seo.price != null
      ? {
          '@type': 'Offer',
          url,
          priceCurrency: seo.currency,
          price: seo.price,
          availability: seo.inStock
            ? 'https://schema.org/InStock'
            : 'https://schema.org/OutOfStock',
          itemCondition: 'https://schema.org/NewCondition',
        }
      : undefined

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: seo.name,
    description,
    image: seo.imageUrls.length ? seo.imageUrls : undefined,
    sku: seo.sku || undefined,
    category: seo.categoryName || undefined,
    offers: offer,
  }
}

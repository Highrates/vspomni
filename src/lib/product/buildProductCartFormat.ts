import type { ProductDetailNode } from '@/graphql/types/product.types'
import type { ProductCardItem } from '@/types/product'
import { normalizeAromaLabel } from '@/lib/normalizeAromaLabel'
import { variantShippingFromSaleorVariant } from '@/lib/saleorVariantShipping'
import { isProductInStock } from '@/lib/product/stock'

export function buildProductCartFormat(
  data: ProductDetailNode,
  catalogDiscountPercent?: number,
): ProductCardItem | null {
  const firstVariant = data.productVariants?.edges?.[0]?.node
  if (!firstVariant) return null

  const basePrice = firstVariant.pricing.price.gross.amount
  let oldPrice = firstVariant.pricing.priceUndiscounted?.gross?.amount
  let discountPercent: number | undefined

  if (oldPrice && oldPrice > basePrice) {
    discountPercent = Math.round(((oldPrice - basePrice) / oldPrice) * 100)
  }

  if (typeof catalogDiscountPercent === 'number' && catalogDiscountPercent > 0) {
    discountPercent = Math.round(catalogDiscountPercent)
    oldPrice = Math.round((basePrice * 100) / (100 - discountPercent))
  }

  const aromaAttribute = data.attributes?.find(
    (attr) => attr.attribute?.slug === 'aromaty-v-kartochke-tovara',
  )
  const aromaValues = aromaAttribute?.values || []
  const aromas = aromaValues
    .map((val) => normalizeAromaLabel(val.name || val.value || ''))
    .filter(Boolean)

  const group = aromas.map((aroma: string, index: number) => {
    let groupType = 'flower'
    if (aroma.toLowerCase().includes('сладк') || aroma.includes('🤤')) {
      groupType = 'sweet'
    } else if (aroma.toLowerCase().includes('цветочн') || aroma.includes('🌸')) {
      groupType = 'flower'
    } else if (aroma.toLowerCase().includes('древесн') || aroma.includes('🪵')) {
      groupType = 'wood'
    }
    return { id: index + 1, group: groupType, title: aroma }
  })

  const ship = variantShippingFromSaleorVariant(firstVariant, data.metadata)

  return {
    id: String(data.id),
    name: data.name,
    price: basePrice,
    oldPrice,
    discountPercent,
    image: data.media[0]?.url || data.thumbnail.url,
    thumbnail: data.thumbnail.url,
    slug: data.slug,
    categorySlug: data.category?.slug,
    aromas,
    size: firstVariant.name,
    variantId: firstVariant.id,
    group,
    weight: ship.weight,
    length: ship.length,
    width: ship.width,
    height: ship.height,
    inStock: isProductInStock(data),
    quantityAvailable:
      typeof firstVariant.quantityAvailable === 'number'
        ? firstVariant.quantityAvailable
        : firstVariant.quantityAvailable ?? null,
    quantityLimitPerCustomer:
      typeof firstVariant.quantityLimitPerCustomer === 'number'
        ? firstVariant.quantityLimitPerCustomer
        : firstVariant.quantityLimitPerCustomer ?? null,
  }
}

export function getInitialProductPageUiState(data: ProductDetailNode) {
  const firstVariant = data.productVariants?.edges?.[0]?.node
  const basePrice = firstVariant?.pricing.price.gross.amount ?? 0

  return {
    mainImage: data.media[0]?.url || data.thumbnail?.url || '',
    price: basePrice,
    selectedVariantId: firstVariant?.id ?? null,
    productCartFormat: buildProductCartFormat(data),
  }
}

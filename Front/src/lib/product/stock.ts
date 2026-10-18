/**
 * Единый источник наличия для SEO (noscript/JSON-LD), PDP и корзины.
 *
 * Saleor часто оставляет isAvailableForPurchase=true при quantityAvailable=0 —
 * для Google Merchant / Яндекс.Товары смотрим реальный остаток.
 */

export type StockVariantLike = {
  id?: string
  quantityAvailable?: number | null
}

export type StockProductLike = {
  isAvailableForPurchase?: boolean | null
  productVariants?: {
    edges?: Array<{ node: StockVariantLike }> | null
  } | null
}

/** Вариант продаётся: остаток > 0 или учёт склада не ведётся (null). */
export function isVariantSellable(
  quantityAvailable?: number | null,
): boolean {
  if (quantityAvailable == null) return true
  return quantityAvailable > 0
}

/**
 * Товар доступен к продаже:
 * - канал не запретил покупку (isAvailableForPurchase !== false)
 * - есть хотя бы один вариант с остатком (или без трекинга)
 */
export function isProductInStock(product: StockProductLike): boolean {
  if (product.isAvailableForPurchase === false) return false

  const edges = product.productVariants?.edges
  if (!edges?.length) {
    return true
  }

  return edges.some((e) => isVariantSellable(e.node?.quantityAvailable))
}

/** Наличие конкретного выбранного варианта (PDP). */
export function isSelectedVariantInStock(
  product: StockProductLike,
  variantId: string | null | undefined,
): boolean {
  if (product.isAvailableForPurchase === false) return false
  if (!variantId) return isProductInStock(product)

  const edge = product.productVariants?.edges?.find(
    (e) => e.node?.id === variantId,
  )
  if (!edge) return false
  return isVariantSellable(edge.node.quantityAvailable)
}

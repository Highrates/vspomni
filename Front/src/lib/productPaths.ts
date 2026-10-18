const INVALID_SLUGS = new Set(['undefined', 'null', ''])

/** Проверка slug товара/категории для URL и 404 */
export function isValidSlug(slug: string | null | undefined): slug is string {
  if (slug == null) return false
  const trimmed = String(slug).trim()
  if (!trimmed) return false
  return !INVALID_SLUGS.has(trimmed.toLowerCase())
}

/** ЧПУ карточки товара: /category/{category-slug}/{product-slug} */
export function categoryProductPath(
  categorySlug: string,
  productSlug: string,
): string | null {
  if (!isValidSlug(categorySlug) || !isValidSlug(productSlug)) return null
  return `/category/${encodeURIComponent(categorySlug)}/${encodeURIComponent(productSlug)}`
}

/** ЧПУ карточки товара: /category/{category-slug}/{product-slug} или /product/{slug} */
export function productDetailPath(product: {
  slug: string
  categorySlug?: string | null
}): string | null {
  if (!isValidSlug(product.slug)) return null
  const cat = product.categorySlug?.trim()
  if (cat && isValidSlug(cat)) {
    return categoryProductPath(cat, product.slug)
  }
  return `/product/${encodeURIComponent(product.slug)}`
}

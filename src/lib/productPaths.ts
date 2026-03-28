/** ЧПУ карточки товара: /category/{category-slug}/{product-slug} */
export function productDetailPath(product: {
  slug: string
  categorySlug?: string | null
}): string {
  const slug = product.slug
  const cat = product.categorySlug?.trim()
  if (cat) {
    return `/category/${encodeURIComponent(cat)}/${encodeURIComponent(slug)}`
  }
  return `/product/${encodeURIComponent(slug)}`
}

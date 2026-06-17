import { productDetailPath } from '@/lib/productPaths'
import type { Category } from '@/types/category'
import type { ProductCardItem } from '@/types/product'

type Props = {
  categories: Category[]
  products: ProductCardItem[]
}

export default function CatalogPageNoscript({
  categories,
  products,
}: Props) {
  const linkedProducts = products.flatMap((product) => {
    const href = productDetailPath(product)
    return href ? [{ product, href }] : []
  })

  if (categories.length === 0 && linkedProducts.length === 0) return null

  return (
    <noscript>
      <div className="px-4 py-4 max-w-5xl mx-auto">
        {categories.length > 0 ? (
          <nav aria-label="Категории каталога">
            <h2>Категории</h2>
            <ul>
              {categories.map((category) => (
                <li key={category.id}>
                  <a href={`/category/${encodeURIComponent(category.slug)}`}>
                    {category.name}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}
        {linkedProducts.length > 0 ? (
          <nav aria-label="Товары каталога">
            <h2>Товары</h2>
            <ul>
              {linkedProducts.map(({ product, href }) => (
                <li key={product.id}>
                  <a href={href}>
                    {product.name}
                    {product.size ? ` — ${product.size}` : ''}
                    {product.price > 0 ? ` — ${product.price} ₽` : ''}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}
      </div>
    </noscript>
  )
}

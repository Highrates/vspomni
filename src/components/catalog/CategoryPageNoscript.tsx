import { productDetailPath } from '@/lib/productPaths'
import type { ProductCardItem } from '@/types/product'

type Props = {
  categoryName: string
  products: ProductCardItem[]
}

export default function CategoryPageNoscript({
  categoryName,
  products,
}: Props) {
  if (products.length === 0) return null

  return (
    <noscript>
      <nav
        className="px-4 py-4 max-w-5xl mx-auto"
        aria-label={`Товары: ${categoryName}`}
      >
        <h2>{categoryName}</h2>
        <ul>
          {products.map((product) => (
            <li key={product.id}>
              <a href={productDetailPath(product)}>
                {product.name}
                {product.size ? ` — ${product.size}` : ''}
                {product.price > 0 ? ` — ${product.price} ₽` : ''}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </noscript>
  )
}

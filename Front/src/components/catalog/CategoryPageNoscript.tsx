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
  const linkedProducts = products.flatMap((product) => {
    const href = productDetailPath(product)
    return href ? [{ product, href }] : []
  })

  if (linkedProducts.length === 0) return null

  return (
    <noscript>
      <nav
        className="px-4 py-4 max-w-5xl mx-auto"
        aria-label={`Товары: ${categoryName}`}
      >
        <h2>{categoryName}</h2>
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
    </noscript>
  )
}

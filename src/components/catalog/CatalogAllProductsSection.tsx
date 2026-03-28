'use client'

import ProductCard from '@/components/home/ProductCard'
import type { ProductCardItem } from '@/types/product'

type Props = {
  products: ProductCardItem[]
}

export default function CatalogAllProductsSection({ products }: Props) {
  return (
    <section className="px-2 py-2 mb-10 sm:mb-12 md:mb-16 lg:mb-20 relative z-10">
      <h2 className="text-xl sm:text-[36px] md:text-[42px] lg:text-[48px] font-semibold text-black mb-4 sm:mb-5 md:mb-6">
        Все товары
      </h2>
      {products.length === 0 ? (
        <p className="text-neutral-500 text-sm sm:text-base">
          Список товаров временно недоступен. Попробуйте обновить страницу позже.
        </p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5 p-2 -m-2">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </section>
  )
}

import ProductCard from '@/components/home/ProductCardAlt'
import { mockProductsGrid } from '@/lib/mock/products'
import { productsGridItem } from '@/lib/mock/products'

export default function ProductGrid() {
  return (
    <section className="mt-10 mb-10 md:mt-45 md:mb-45 md:p-0 px-2">
      <div className="flex items-center justify-between mb-14">
        <h3 className="text-[38px] sm:text-[36px] md:text-[42px] lg:text-[48px] font-semibold  select-none">
          Все ароматы
        </h3>
      </div>
      <div className="grid overflow-x-auto sm:grid-cols-2 lg:grid-cols-4 gap-6 products-grid">
        {mockProductsGrid.map((product: productsGridItem) => (
          <ProductCard product={product} key={product.id} />
        ))}
      </div>
    </section>
  )
}

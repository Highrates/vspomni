import Link from 'next/link'
import Image from 'next/image'
import ProductCard from '@/components/home/ProductCardAlt'
import { mockProductsGrid, productsGridItem } from '@/lib/mock/products'

export default function PopularScentsAlt() {
  return (
    <section className="mb-45 mt-45 px-2">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 sm:mb-14 gap-3">
        <h3 className="text-2xl sm:text-[40px] lg:text-[48px] font-semibold select-none ">
          Популярные ароматы
        </h3>

        <Link href="/product" className="text-base text-black font-medium flex items-center -ml-5">
          <span className="text-md font-medium">Все</span>
          <Image
            src="/to_right.svg"
            alt="all news link"
            width={20}
            height={24}
            className="ml-1 h-auto"
          />
        </Link>
      </div>

      {/* Responsive Product Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
        {mockProductsGrid.slice(0, 4).map((product: productsGridItem) => (
          <ProductCard product={product} key={product.id} />
        ))}
      </div>
    </section>
  )
}

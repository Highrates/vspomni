'use client'

import { useParams } from 'next/navigation'
import { useEffect } from 'react'
import { useCategoriesStore } from '@/stores/useCategories'
import { ProductCardItem } from '@/types/product'
import BackButton from '@/components/ui/BackButton'
import ProductCard from '@/components/home/ProductCard'

export default function CategoryPage() {
  const { slug } = useParams()
  const { categories, items, fetchProductsByCategorySlug } =
    useCategoriesStore()

  const categoryName = categories.find(
    (category) => category.slug === slug,
  )?.name

  useEffect(() => {
    fetchProductsByCategorySlug(String(slug))
  }, [slug])

  return (
    <section className="mt-6 mb-8 sm:mt-10 sm:mb-12 md:mt-20 md:mb-20 lg:mt-45 lg:mb-45 px-2 py-4">
      <div className="container mb-4">
        <BackButton />
      </div>

      {items.length < 1 && (
        <p className="container w-full min-h-[100px] flex justify-center items-center">
          нет товаров в данной категории
        </p>
      )}

      {items.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-6 sm:mb-10 md:mb-14">
            <h3 className="text-xl sm:text-[36px] md:text-[42px] lg:text-[48px] font-semibold select-none">
              {categoryName}
            </h3>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 products-grid p-2 -m-2 pb-6">
            {items.map((product: ProductCardItem, index: number) => (
              <ProductCard
                product={product}
                key={product.id}
                isNew={index < 2}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  )
}

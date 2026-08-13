'use client'

import { useEffect, useState } from 'react'
import ProductCard from '@/components/home/ProductCard'
import { ProductCardItem } from '@/types/product'
import { getProductsByCollectionId } from '@/graphql/queries/product.service'
import { interleaveProductsByCategoryAndAroma } from '@/lib/product/interleaveProducts'

const COLLECTION_NOSE_ID = 'Q29sbGVjdGlvbjo1' // Ваши вкусовые сосочки будут в восторге
const TITLE = 'Ваши вкусовые сосочки будут в восторге'

export default function CollectionNoseBlock() {
  const [products, setProducts] = useState<ProductCardItem[]>([])
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const fetchProducts = async () => {
      try {
        // Вся коллекция из дашборда (без усечения до 12)
        const data = await getProductsByCollectionId(COLLECTION_NOSE_ID)
        if (data && data.length > 0) {
          setProducts(
            interleaveProductsByCategoryAndAroma(data, data.length),
          )
        }
      } catch (error) {
        console.error('CollectionNoseBlock: failed to fetch products', error)
      } finally {
        setLoading(false)
      }
    }
    fetchProducts()
  }, [])

  if (!mounted) return null

  if (loading) {
    return (
      <section className="mt-4 sm:mt-6 md:mt-8 lg:mt-10 mb-4 sm:mb-6 md:mb-8 lg:mb-10 px-2 py-2">
        <h2 className="text-xl sm:text-[36px] md:text-[42px] lg:text-[48px] font-semibold select-none mb-4 sm:mb-6">
          {TITLE}
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="rounded-xl bg-gray-200 aspect-[3/4] animate-pulse"
            />
          ))}
        </div>
      </section>
    )
  }

  if (products.length === 0) return null

  return (
    <section className="mt-4 sm:mt-6 md:mt-8 lg:mt-10 mb-4 sm:mb-6 md:mb-8 lg:mb-10 px-2 py-2">
      <h2 className="text-xl sm:text-[36px] md:text-[42px] lg:text-[48px] font-semibold select-none mb-4 sm:mb-5 md:mb-6">
        {TITLE}
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5 p-2 -m-2">
        {products.map((product, index) => (
          <ProductCard
            product={product}
            key={product.id}
            isNew={index === 0}
          />
        ))}
      </div>
    </section>
  )
}

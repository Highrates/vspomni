import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Category } from '@/types/category'
import { ProductCardItem } from '@/types/product'
import { getAllCategory } from '@/graphql/queries/category.service'
import { getProductsByCategorySlug } from '@/graphql/queries/product.service'

interface CategoriesState {
  categories: Category[]
  items: ProductCardItem[]
  fetchCategories: () => Promise<void>
  fetchProductsByCategorySlug: (slug: string) => Promise<void>
}

export const useCategoriesStore = create<CategoriesState>()(
  persist(
    (set) => ({
      categories: [],
      items: [],
      fetchCategories: async () => {
        await getAllCategory(10).then((res: any) => {
          if (res.length > 0) {
            set({
              categories: res,
            })
          }
        })
      },
      fetchProductsByCategorySlug: async (slug: string) => {
        await getProductsByCategorySlug(slug).then((res: any) => {
          if (res.length > 0) {
            set({
              items: res,
            })
          } else {
            set({
              items: [],
            })
          }
        })
      },
    }),
    {
      name: 'categories-storage',
    },
  ),
)

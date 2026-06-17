'use client'

import { useEffect, useMemo, useState } from 'react'
import { useCategoriesStore } from '@/stores/useCategories'
import CatalogCategoryBannersView from '@/components/catalog/CatalogCategoryBannersView'
import type { Category } from '@/types/category'

export { catalogCategorySortKey } from '@/lib/category/catalogCategories'

type Props = {
  /** Не показывать карточку текущей категории (страница /category/[slug]) */
  excludeSlug?: string
  /** Категории с сервера (SSR) — баннеры сразу в HTML */
  initialCategories?: Category[]
}

export default function CatalogCategoryBanners({
  excludeSlug,
  initialCategories = [],
}: Props) {
  const { categories: storeCategories, fetchCategories } = useCategoriesStore()
  const [categories, setCategories] = useState<Category[]>(initialCategories)

  useEffect(() => {
    setCategories(initialCategories.length > 0 ? initialCategories : storeCategories)
  }, [initialCategories, storeCategories])

  useEffect(() => {
    if (initialCategories.length > 0) {
      useCategoriesStore.setState({ categories: initialCategories })
      return
    }
    void fetchCategories()
  }, [fetchCategories, initialCategories])

  const resolvedCategories = useMemo(() => {
    if (initialCategories.length > 0) return initialCategories
    return categories
  }, [initialCategories, categories])

  return (
    <CatalogCategoryBannersView
      categories={resolvedCategories}
      excludeSlug={excludeSlug}
    />
  )
}

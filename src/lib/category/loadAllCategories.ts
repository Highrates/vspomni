import { cache } from 'react'
import { getAllCategory } from '@/graphql/queries/category.service'

export const loadAllCategories = cache(async () => {
  return getAllCategory(20).catch(() => [])
})

import { cache } from 'react'
import { getSingleArticle } from '@/graphql/queries/articles.service'

export const loadArticleBySlug = cache(async (slug: string) => {
  return getSingleArticle(slug)
})

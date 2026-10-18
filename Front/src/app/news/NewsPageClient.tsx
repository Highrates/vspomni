'use client'

import BackButton from '@/components/ui/BackButton'
import NewsCard from '@/components/news/NewsCard'
import PopularScentsAlt from '@/components/features/PopularScentsAlt'
import { useEffect, useState } from 'react'
import {
  getAllArticles,
  type ArticleNode,
} from '@/graphql/queries/articles.service'
import { mapArticlesToNewsList } from '@/lib/articles/newsList'
import type { NewsListItem } from '@/lib/articles/newsList'

type Props = {
  /** Публикации с сервера (SSR) — сразу в HTML для SEO */
  initialArticles?: ArticleNode[]
}

export default function NewsPageClient({ initialArticles = [] }: Props) {
  const [items, setItems] = useState<NewsListItem[]>(() =>
    mapArticlesToNewsList(initialArticles),
  )
  const [loading, setLoading] = useState(initialArticles.length === 0)

  useEffect(() => {
    setItems(mapArticlesToNewsList(initialArticles))
    setLoading(initialArticles.length === 0)
  }, [initialArticles])

  useEffect(() => {
    if (initialArticles.length > 0) return

    let cancelled = false

    getAllArticles(20)
      .then((fetchedArticles) => {
        if (cancelled) return
        setItems(mapArticlesToNewsList(fetchedArticles))
        setLoading(false)
      })
      .catch((error) => {
        console.error('Error fetching articles:', error)
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [initialArticles.length])

  return (
    <div className="px-3 sm:px-4 md:px-0 pt-2 sm:pt-3">
      <div className="container">
        <BackButton />
      </div>
      <h1 className="container mb-8 sm:mb-10 md:mb-14 font-semibold text-xl sm:text-2xl md:text-3xl select-none">
        Будь в курсе с ВСПОМНИ.
      </h1>

      {loading ? (
        <div className="container flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
        </div>
      ) : items.length === 0 ? (
        <p className="container text-black/70 text-sm sm:text-base py-8">
          Публикации скоро появятся.
        </p>
      ) : (
        <div className="container grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
          {items.map((item) => (
            <NewsCard
              key={item.id}
              date={item.date}
              title={item.title}
              shortText={item.shortText}
              imageUrl={item.imageUrl}
              articleUrl={item.articleUrl}
            />
          ))}
        </div>
      )}

      <PopularScentsAlt />
    </div>
  )
}

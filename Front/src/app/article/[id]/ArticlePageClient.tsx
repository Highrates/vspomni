'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import BackButton from '@/components/ui/BackButton'
import { getSingleArticle, ArticleNode } from '@/graphql/queries/articles.service'
import { formatArticleDate } from '@/lib/articles'
import { renderEditorJsContent } from '@/components/content/renderEditorJsContent'

function ArticleBodyImage({ src, alt }: { src: string; alt: string }) {
  return (
    <section className="w-full relative aspect-[16/9] sm:aspect-[4/2] overflow-hidden rounded-xl">
      <Image
        src={src}
        alt={alt}
        fill
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 768px, 768px"
        className="object-cover"
      />
    </section>
  )
}

type Props = {
  slug: string
  /** Статья с сервера (SSR) — сразу в HTML для SEO */
  initialArticle?: ArticleNode | null
}

export default function ArticlePageClient({
  slug,
  initialArticle = null,
}: Props) {
  const [article, setArticle] = useState<ArticleNode | null>(initialArticle)
  const [loading, setLoading] = useState(!initialArticle)

  useEffect(() => {
    if (initialArticle) {
      setArticle(initialArticle)
      setLoading(false)
      return
    }

    let cancelled = false

    async function fetchArticle() {
      if (!slug) return

      try {
        setLoading(true)
        const data = await getSingleArticle(slug)
        if (!cancelled) setArticle(data)
      } catch (error) {
        console.error('Error fetching article:', error)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchArticle()
    return () => {
      cancelled = true
    }
  }, [slug, initialArticle])

  if (loading) {
    return (
      <article className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-0">
        <BackButton />
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded mb-10"></div>
          <div className="h-64 bg-gray-200 rounded mb-10"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </article>
    )
  }

  if (!article) {
    return (
      <article className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-0">
        <BackButton />
        <h1 className="mb-10 sm:mb-14 font-semibold text-2xl sm:text-3xl select-none">
          Статья не найдена
        </h1>
      </article>
    )
  }

  const date = formatArticleDate(article.publishedAt || article.created)
  const imageUrl = article.imageUrl?.trim()

  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-0">
      <BackButton />
      <h1 className="mb-10 sm:mb-14 font-semibold text-2xl sm:text-3xl select-none">
        {article.title}
      </h1>

      <div className="flex flex-col space-y-10 sm:space-y-12">
        {imageUrl ? (
          <ArticleBodyImage src={imageUrl} alt={article.title} />
        ) : null}

        {renderEditorJsContent(article.osnovnojTekst)}

        {article.dopIzobrazhenie1Url ? (
          <ArticleBodyImage
            src={article.dopIzobrazhenie1Url}
            alt={`${article.title} — изображение 1`}
          />
        ) : null}

        {article.dopIzobrazhenie2Url ? (
          <ArticleBodyImage
            src={article.dopIzobrazhenie2Url}
            alt={`${article.title} — изображение 2`}
          />
        ) : null}

        {renderEditorJsContent(article.content)}

        {date && (
          <section className="w-full">
            <p className="font-medium text-base sm:text-lg mt-4 text-gray-500">
              {date}
            </p>
          </section>
        )}
      </div>
    </article>
  )
}

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

type Props = { slug: string }

export default function ArticlePageClient({ slug }: Props) {
  const [article, setArticle] = useState<ArticleNode | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchArticle() {
      if (!slug) return

      try {
        setLoading(true)
        const data = await getSingleArticle(slug)
        setArticle(data)
      } catch (error) {
        console.error('Error fetching article:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchArticle()
  }, [slug])

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

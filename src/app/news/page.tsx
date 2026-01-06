'use client'

import BackButton from '@/components/ui/BackButton'
import NewsCard from '@/components/news/NewsCard'
import PopularScentsAlt from "@/components/features/PopularScentsAlt"
import { useEffect, useState } from 'react'
import { getAllArticles } from '@/graphql/queries/articles.service'
import { formatArticleDate } from '@/lib/articles'

const getImageUrl = (assignedAttributes: any[]) => {
  const imageAttr = assignedAttributes?.find(
    attr => attr.fileValue?.url
  )
  return imageAttr?.fileValue?.url || ''
}

const getShortText = (content: string, maxLength = 150) => {
  try {
    const parsed = JSON.parse(content)
    const firstBlock = parsed.blocks?.[0]
    
    if (firstBlock?.data?.text) {
      const text = firstBlock.data.text
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .trim()
      
      if (text.length > maxLength) {
        return text.substring(0, maxLength) + '...'
      }
      return text
    }
  } catch (error) {
    console.error('Error parsing content:', error)
  }
  return ''
}



export default function NewsPage() {
  const [articles, setArticles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getAllArticles(20)
      .then((fetchedArticles) => {
        setArticles(fetchedArticles)
        setLoading(false)
      })
      .catch((error) => {
        console.error('Error fetching articles:', error)
        setLoading(false)
      })
  }, [])

  return (
    <div className='px-3 sm:px-4 md:px-0 pt-6'>
      <div className="container">
        <BackButton/>
      </div>
      <h2 className="container mb-8 sm:mb-10 md:mb-14 font-semibold text-xl sm:text-2xl md:text-3xl select-none">
        Будь в курсе с ВСПОМНИ.
      </h2>
      
      {loading ? (
        <div className="container flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
        </div>
      ) : (
        <div className="container grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
          {articles.map((article) => (
            <NewsCard
              key={article.id}
              date={formatArticleDate(article.publishedAt)}
              title={article.title}
              shortText={getShortText(article.content)}
              imageUrl={getImageUrl(article.assignedAttributes)}
              articleUrl={`/article/${article.slug}`}
            />
          ))}
        </div>
      )}
      
      <PopularScentsAlt />
    </div>
  )
}
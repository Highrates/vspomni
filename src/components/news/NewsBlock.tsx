'use client'

import { useEffect, useState } from 'react'
import NewsCard from '@/components/news/NewsCard'
import Link from 'next/link'
import Image from 'next/image'
import { getAllArticles } from '@/graphql/queries/articles.service'
import { ArticleNode } from '@/graphql/queries/articles.service'
import { formatArticleDate, extractArticleText } from '@/lib/articles'

export default function NewsBlock() {
  const [articles, setArticles] = useState<ArticleNode[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchArticles() {
      try {
        setLoading(true);
        // Получаем статьи, можно передать slug типа страницы для фильтрации
        // Например: getAllArticles(2, 'article') или getAllArticles(2, 'news')
        const data = await getAllArticles(2);
        setArticles(data);
      } catch (error) {
        console.error('Error fetching articles:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchArticles();
  }, []);

  if (loading) {
    return (
      <section className="container mb-4 px-4 sm:mb-6 md:mb-8 lg:mb-10">
        <div className="mb-4 flex items-center justify-between sm:mb-5 md:mb-6">
          <h3 className="text-xl font-semibold select-none sm:text-[36px] md:text-[42px] lg:text-[48px]">
            Полезные материалы
          </h3>
        </div>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div className="h-64 animate-pulse rounded-xl bg-gray-200" />
          <div className="h-64 animate-pulse rounded-xl bg-gray-200" />
        </div>
      </section>
    )
  }

  if (articles.length === 0) {
    return null
  }

  return (
    <section className="mb-4 px-4 sm:mb-6 sm:px-2 md:mb-8 lg:mb-10">
      <div className="mb-4 flex items-center justify-between gap-3 sm:mb-5 md:mb-6">
        <h3 className="min-w-0 text-xl font-semibold select-none sm:text-[36px] md:text-[42px] lg:text-[48px]">
          Полезные материалы
        </h3>
        <Link
          href="/news"
          className="flex shrink-0 items-center gap-1 whitespace-nowrap text-base font-medium text-black"
          aria-label="Смотреть все новости и публикации"
        >
          <span className="hidden text-md font-medium sm:inline">
            Смотреть все
          </span>
          <Image
            src="/to_right.svg"
            alt=""
            aria-hidden
            width={20}
            height={24}
            className="h-auto w-auto"
          />
        </Link>
      </div>

      <div className="grid md:grid-cols-2 grid-cols-1 gap-5">
        {articles.map((article) => {
          const date = formatArticleDate(article.publishedAt || article.created);
          const shortText = extractArticleText(article.content);
          const imageUrl = article.imageUrl ?? '';

          return (
            <NewsCard
              key={article.id}
              date={date}
              title={article.title}
              shortText={shortText}
              imageUrl={imageUrl}
              articleUrl={`/article/${article.slug}`}
            />
          );
        })}
      </div>
    </section>
  )
}

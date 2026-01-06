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
      <section className="mb-8 sm:mb-12 md:mb-20 lg:mb-45 container  px-4 max-sm:px-2">
        <div className="flex items-center justify-between mb-6 sm:mb-8 md:mb-14">
          <h3 className="text-xl sm:text-[36px] md:text-[42px] lg:text-[48px] font-semibold select-none">
            Новости и статьи
          </h3>
        </div>
        <div className="grid md:grid-cols-2 grid-cols-1 gap-5">
          <div className="animate-pulse bg-gray-200 h-64 rounded-xl"></div>
          <div className="animate-pulse bg-gray-200 h-64 rounded-xl"></div>
        </div>
      </section>
    );
  }

  if (articles.length === 0) {
    return null;
  }

  return (
    <section className="mb-8 sm:mb-12 md:mb-20 lg:mb-45  p-2">
      <div className="flex items-center justify-between mb-6 sm:mb-8 md:mb-14">
        <h3 className="text-xl sm:text-[36px] md:text-[42px] lg:text-[48px] font-semibold select-none">
          Новости и статьи
        </h3>
        <Link href="/news" className="text-base text-black font-medium flex">
          <span className="text-md font-medium">Все</span>
          <Image
            src="/to_right.svg"
            alt="all news link"
            width={20}
            height={24}
            className="ml-1 h-auto"
          />
        </Link>
      </div>

      <div className="grid md:grid-cols-2 grid-cols-1 gap-5">
        {articles.map((article) => {
          const date = formatArticleDate(article.publishedAt || article.created);
          const shortText = extractArticleText(article.content);
          const imageUrl = article.imageUrl || '/images/blog1.png';
          
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

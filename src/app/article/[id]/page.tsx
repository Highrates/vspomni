'use client'

import React, { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Image from 'next/image'
import BackButton from '@/components/ui/BackButton'
import { getSingleArticle, ArticleNode } from '@/graphql/queries/articles.service'
import { formatArticleDate, parseArticleContent } from '@/lib/articles'

function renderContent(content: any) {
  if (!content) return null;
  
  const parsed = parseArticleContent(content);
  
  // Обычный текст
  if (typeof parsed === 'string') {
    const text = parsed.replace(/<[^>]*>/g, '').trim();
    return (
      <section className="w-full">
        <p className="font-normal text-base sm:text-lg leading-relaxed text-black/90 whitespace-pre-line">
          {text}
        </p>
      </section>
    );
  }
  
  // EditorJS формат
  if (parsed?.blocks?.length) {
    return parsed.blocks.map((block: any, index: number) => {
      if (block.type === 'paragraph' && block.data?.text) {
        const text = block.data.text
          .replace(/<[^>]*>/g, '')
          .replace(/&nbsp;/g, ' ')
          .trim();
        return (
          <section key={index} className="w-full">
            <p className="font-normal text-base sm:text-lg leading-relaxed text-black/90 whitespace-pre-line">
              {text}
            </p>
          </section>
        );
      }
      if (block.type === 'header' && block.data?.text) {
        const level = Math.min(block.data.level || 2, 6);
        const text = block.data.text
          .replace(/<[^>]*>/g, '')
          .replace(/&nbsp;/g, ' ')
          .trim();
        const HeadingTag = `h${level}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
        return (
          <section key={index} className="w-full">
            {React.createElement(HeadingTag, { className: "font-bold text-xl sm:text-2xl mb-4" }, text)}
          </section>
        );
      }
      if (block.type === 'list' && block.data?.items) {
        const ListTag = (block.data.style === 'ordered' ? 'ol' : 'ul') as 'ol' | 'ul';
        return (
          <section key={index} className="w-full">
            {React.createElement(
              ListTag,
              { className: "list-disc list-inside space-y-2" },
              block.data.items.map((item: string, itemIndex: number) => (
                <li 
                  key={itemIndex}
                  className="font-normal text-base sm:text-lg leading-relaxed text-black/90"
                  dangerouslySetInnerHTML={{ __html: item.replace(/&nbsp;/g, ' ') }}
                />
              ))
            )}
          </section>
        );
      }
      if (block.type === 'image' && block.data?.file?.url) {
        return (
          <section key={index} className="w-full flex flex-col gap-4">
            <div className="w-full relative aspect-[16/9] sm:aspect-[4/3] overflow-hidden rounded-xl">
              <Image
                src={block.data.file.url}
                alt={block.data.caption || 'Article image'}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 768px, 768px"
                className="object-cover"
              />
            </div>
            {block.data.caption && (
              <p className="font-normal text-base text-black/70 text-center italic">
                {block.data.caption}
              </p>
            )}
          </section>
        );
      }
      return null;
    }).filter(Boolean);
  }
  
  return null;
}

export default function ArticlePage() {
  const params = useParams();
  const slug = params?.id as string;
  const [article, setArticle] = useState<ArticleNode | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchArticle() {
      if (!slug) return;
      
      try {
        setLoading(true);
        const data = await getSingleArticle(slug);
        setArticle(data);
      } catch (error) {
        console.error('Error fetching article:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchArticle();
  }, [slug]);

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
    );
  }

  if (!article) {
    return (
      <article className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-0">
        <BackButton />
        <h2 className="mb-10 sm:mb-14 font-semibold text-2xl sm:text-3xl select-none">
          Статья не найдена
        </h2>
      </article>
    );
  }

  const date = formatArticleDate(article.publishedAt || article.created);
  const imageUrl = article.imageUrl || '/images/article1.png';

  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-0">
      <BackButton />
      <h2 className="mb-10 sm:mb-14 font-semibold text-2xl sm:text-3xl select-none">
        {article.title}
      </h2>

      <div className="flex flex-col space-y-10 sm:space-y-12">
        {/* Main Image */}
        {imageUrl && (
          <section className="w-full relative aspect-[16/9] sm:aspect-[4/2] overflow-hidden rounded-xl">
            <Image
              src={imageUrl}
              alt={article.title}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 768px, 768px"
              className="object-cover"
            />
          </section>
        )}

        {/* Content */}
        {renderContent(article.content)}

        {/* Date */}
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

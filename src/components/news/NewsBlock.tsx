import NewsCard from '@/components/news/NewsCard'
import Link from 'next/link'
import Image from 'next/image'

import { mockNews } from '@/lib/mock/news'

export default function NewsBlock() {
  return (
    <section className="mb-45 md:p-0 p-2">
      <div className="flex items-center justify-between mb-14">
        <h3 className="text-[28px] sm:text-[36px] md:text-[42px] lg:text-[48px] font-semibold  select-none">
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
        {mockNews.map((article) => (
          <NewsCard
            key={article.id}
            date={article.date}
            title={article.title}
            shortText={article.shortText}
            imageUrl={article.imageURL}
            articleUrl={'/article/' + article.id}
          />
        ))}
      </div>
    </section>
  )
}

'use client'

import BackButton from '@/components/ui/BackButton'
import NewsCard from '@/components/news/NewsCard'
import PopularScentsAlt from "@/components/features/PopularScentsAlt"
import { mockNews } from '@/lib/mock/news'

export default function NewsPage() {
  return (
    <div className='max-sm:p-3'>
    <div className="container">
       <BackButton/>
    </div>
     <h2 className="container mb-14 font-semibold text-3xl select-none">Будь в курсе с ВСПОМНИ.</h2>
    <div className="container grid grid-cols-2 max-sm:grid-cols-1 gap-5">
      {mockNews.map((article) => (
        <NewsCard
          key={article.id}
          date={article.date}
          title={article.title}
          shortText={article.shortText}
          imageUrl={article.imageURL}
          articleUrl={"/article/"+article.id}
        />
      ))}
      {mockNews.map((article) => (
        <NewsCard
          key={article.id}
          date={article.date}
          title={article.title}
          shortText={article.shortText}
          imageUrl={article.imageURL}
          articleUrl={"/article/"+article.id}
        />
      ))}
      {mockNews.map((article) => (
        <NewsCard
          key={article.id}
          date={article.date}
          title={article.title}
          shortText={article.shortText}
          imageUrl={article.imageURL}
          articleUrl={"/article/"+article.id}
        />
      ))}
    </div> 
    <PopularScentsAlt />
    </div>
  )
}

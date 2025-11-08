import Hero from '@/components/home/Hero'
import ProductGrid from '@/components/home/ProductGrid'
import StoryBlock from '@/components/features/StoryBlock'
import PopularScents from '@/components/features/PopularScents'
import ComingSoon from '@/components/features/ComingSoon'
import Choice from '@/components/home/Choice'
import NewsBlock from '@/components/news/NewsBlock'
import FaqBlock from '@/components/home/FaqBlock'
import HistoryLine from '@/components/home/HistoryLine'

export default function Home() {
  return (
    <>
      <Hero />
      <StoryBlock />
      <PopularScents />
      <ComingSoon />
      <Choice />
      <HistoryLine />
      <ProductGrid />
      <NewsBlock />
      <FaqBlock />
    </>
  )
}

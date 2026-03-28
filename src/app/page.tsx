import Hero from '@/components/home/Hero'
import ProductGrid from '@/components/home/ProductGrid'
import GiftPackagesBanner from '@/components/home/GiftPackagesBanner'
import CollectionNoseBlock from '@/components/home/CollectionNoseBlock'
import StoryBlock from '@/components/features/StoryBlock'
import PopularScentsAlt from '@/components/features/PopularScentsAlt'
import ComingSoon from '@/components/features/ComingSoon'
import Choice from '@/components/home/Choice'
import NewsBlock from '@/components/news/NewsBlock'
import FaqBlock from '@/components/home/FaqBlock'
import HistoryLine from '@/components/home/HistoryLine'
import CandlesSoonBanner from '@/components/home/CandlesSoonBanner'
import { getCandlesSoonBanner } from '@/graphql/queries/candlesSoon.service'
import { getChoiceProducts } from '@/graphql/queries/product.service'

// Обновляем главную страницу по данным моделей раз в минуту
export const revalidate = 60

export default async function Home() {
  const [candlesSoon, choiceProducts] = await Promise.all([
    getCandlesSoonBanner().catch(() => null),
    getChoiceProducts().catch(() => []),
  ])

  return (
    <>
      <Hero />
      <StoryBlock />
      <PopularScentsAlt />
      <ComingSoon />
      <Choice initialProducts={choiceProducts} />
      <HistoryLine />
      <ProductGrid />
      <GiftPackagesBanner />
      <CollectionNoseBlock />
      <CandlesSoonBanner
        imageUrl={candlesSoon?.imageUrl ?? null}
        bannerText={candlesSoon?.bannerText ?? candlesSoon?.title ?? null}
      />
      <NewsBlock />
      <FaqBlock />
    </>
  )
}

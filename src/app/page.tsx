import type { Metadata } from 'next'
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

const HOME_TITLE = 'Ароматы для дома и интерьера | ВСПОМНИ'
const HOME_DESCRIPTION =
  'Интерьерные ароматы для дома от бренда ВСПОМНИ: диффузоры, саше и декор — наполните пространство воспоминаниями и уютом.'

const HOME_KEYWORDS = [
  'ароматы для дома',
  'аромат для дома',
  'интерьерные ароматы',
  'ароматизация дома',
  'ароматы для интерьера',
  'домашние ароматизаторы',
  'магазин ароматов для дома',
  'аромадекор',
  'парфюмерия для интерьера',
  'парфюмерия для дома',
  'парфюмерия для пространства',
  'премиум ароматы для дома',
]

export const metadata: Metadata = {
  title: HOME_TITLE,
  description: HOME_DESCRIPTION,
  keywords: HOME_KEYWORDS,
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    url: '/',
    siteName: 'ВСПОМНИ',
    locale: 'ru_RU',
    type: 'website',
  },
}

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

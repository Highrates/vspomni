import type { Metadata } from 'next'
import { buildPageMetadata } from '@/lib/seo/buildPageMetadata'
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
import {
  pickComingSoonCategories,
  pickGiftPackagesCategory,
} from '@/lib/category/catalogCategories'
import { loadAllCategories } from '@/lib/category/loadAllCategories'
import { getCandlesSoonBanner } from '@/graphql/queries/candlesSoon.service'
import { getChoiceProducts } from '@/graphql/queries/product.service'

// Обновляем главную страницу по данным моделей раз в минуту
export const revalidate = 60

const HOME_TITLE = 'Ароматы для дома и интерьера'
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

export const metadata: Metadata = buildPageMetadata({
  title: HOME_TITLE,
  description: HOME_DESCRIPTION,
  canonicalPath: '/',
  keywords: HOME_KEYWORDS,
})

export default async function Home() {
  const [candlesSoon, choiceProducts, allCategories] = await Promise.all([
    getCandlesSoonBanner().catch(() => null),
    getChoiceProducts().catch(() => []),
    loadAllCategories(),
  ])

  const comingSoonCategories = pickComingSoonCategories(allCategories)
  const giftPackagesCategory = pickGiftPackagesCategory(allCategories)

  return (
    <>
      <Hero />
      <StoryBlock />
      <PopularScentsAlt />
      <ComingSoon initialCategories={comingSoonCategories} />
      <Choice initialProducts={choiceProducts} />
      <HistoryLine />
      <ProductGrid />
      <GiftPackagesBanner initialCategory={giftPackagesCategory} />
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

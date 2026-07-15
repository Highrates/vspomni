import type { Metadata } from 'next'
import { buildPageMetadata } from '@/lib/seo/buildPageMetadata'
import { faqPageJsonLd } from '@/lib/seo/faqJsonLd'
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
import FaqNoscript from '@/components/home/FaqNoscript'
import HistoryLine from '@/components/home/HistoryLine'
import CandlesSoonBanner from '@/components/home/CandlesSoonBanner'
import {
  pickComingSoonCategories,
  pickGiftPackagesCategory,
} from '@/lib/category/catalogCategories'
import { loadAllCategories } from '@/lib/category/loadAllCategories'
import { getCandlesSoonBanner } from '@/graphql/queries/candlesSoon.service'
import { getChoiceProducts } from '@/graphql/queries/product.service'
import { getAllFaqs } from '@/graphql/queries/faq.service'

// Обновляем главную страницу по данным моделей раз в минуту
export const revalidate = 60

const HOME_TITLE = 'Ароматы для дома и интерьера'
const HOME_DESCRIPTION =
  'Интерьерные ароматы для дома от бренда ВСПОМНИ: диффузоры, саше и декор — наполните пространство воспоминаниями и уютом.'

export const metadata: Metadata = buildPageMetadata({
  title: HOME_TITLE,
  description: HOME_DESCRIPTION,
  canonicalPath: '/',
  ogImage: '/images/catalogTop.png',
})

export default async function Home() {
  const [candlesSoon, choiceProducts, allCategories, faqs] = await Promise.all([
    getCandlesSoonBanner().catch(() => null),
    getChoiceProducts().catch(() => []),
    loadAllCategories(),
    getAllFaqs().catch(() => []),
  ])

  const comingSoonCategories = pickComingSoonCategories(allCategories)
  const giftPackagesCategory = pickGiftPackagesCategory(allCategories)
  const faqJsonLd = faqPageJsonLd(faqs)

  return (
    <>
      {faqJsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      ) : null}
      <FaqNoscript faqs={faqs} />
      <Hero />
      <section className="px-4 sm:px-6 md:px-8 pt-6 sm:pt-8 md:pt-10">
        <h1 className="text-xl sm:text-[36px] md:text-[42px] lg:text-[48px] font-semibold text-black select-none">
          {HOME_TITLE}
        </h1>
      </section>
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
      <FaqBlock initialFaqs={faqs} />
    </>
  )
}

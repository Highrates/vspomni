export interface CandlesSoonBannerData {
  imageUrl: string | null
  bannerText: string | null
  title: string | null
}

/**
 * Баннер «Скоро свечи» на главной.
 * Nest CMS пока нет — явный static asset.
 */
export async function getCandlesSoonBanner(): Promise<CandlesSoonBannerData | null> {
  return {
    imageUrl: '/images/skoro-svechi.jpeg',
    bannerText: 'Скоро свечи',
    title: 'Скоро свечи',
  }
}

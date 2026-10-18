import { getHeroSecondaryBanner, getHeroSlides } from '@/api/settingsApi'

export interface SliderItem {
  id: string
  image: string
  title?: string
  text?: string
  /** Ссылка большого баннера */
  href?: string
}

/** Нижняя плашка Hero */
export interface HeroBottomBanner {
  image: string
  title: string
  description: string
  /** Куда ведёт плашка: товар, аромат или категория */
  href: string
}

/**
 * Для <img> в браузере: только relative `/uploads` или `/images`,
 * иначе на телефоне (LAN) `localhost`/`127.0.0.1` = пустой баннер.
 */
function toSameOriginMedia(url: string | null | undefined): string {
  const s = (url || '').trim()
  if (!s) return ''
  if (s.startsWith('/') && !s.startsWith('//')) return s
  try {
    const u = new URL(s)
    if (
      u.pathname.startsWith('/uploads') ||
      u.pathname.startsWith('/images/') ||
      u.pathname.startsWith('/logo/')
    ) {
      return `${u.pathname}${u.search}`
    }
  } catch {
    /* ignore */
  }
  return s
}

/** Десктоп: Nest `GET /settings/hero` → `imageUrl` */
export async function getSlider(): Promise<SliderItem[]> {
  const slides = await getHeroSlides()
  return slides
    .filter((s) => s.imageUrl)
    .map((s) => ({
      id: s.id,
      image: toSameOriginMedia(s.imageUrl),
      href: s.href?.trim() || '/catalog',
    }))
    .filter((s) => s.image)
}

/** Мобилка: `mobileImageUrl`, иначе десктопная картинка */
export async function getMobileSlider(): Promise<SliderItem[]> {
  const slides = await getHeroSlides()
  return slides
    .map((s) => ({
      id: s.id,
      image: toSameOriginMedia(s.mobileImageUrl || s.imageUrl),
      href: s.href?.trim() || '/catalog',
    }))
    .filter((s) => s.image)
}

/** Nest `GET /settings/hero-secondary` — одна плашка на все слайды */
export async function getHeroBottomBanners(): Promise<HeroBottomBanner[]> {
  const secondary = await getHeroSecondaryBanner()
  if (!secondary) return []
  return [
    {
      image: toSameOriginMedia(secondary.imageUrl),
      title: secondary.title,
      description: secondary.subtitle,
      href: secondary.href,
    },
  ]
}

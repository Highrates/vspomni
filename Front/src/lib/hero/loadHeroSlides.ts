import { apiFetch, uploadsUrl } from '@/api/apiClient'
import type { HeroPlaque, HeroSlide } from '@vspomni/hero-types'
import { HERO_SLIDE_HREF_DEFAULT, normalizeHeroPlaque } from '@vspomni/hero-types'

export type { HeroPlaque, HeroSlide }

function normalizeMedia(url: string | null | undefined): string {
  if (!url?.trim()) return ''
  return uploadsUrl(url) || url.trim()
}

/**
 * Один GET /settings/hero — resolved slide + plaque для SSR.
 * (Раньше лежал в graphql/queries/slider.service — это REST, не GraphQL.)
 */
export async function loadHeroSlides(): Promise<HeroSlide[]> {
  const res = await apiFetch<{ items: HeroSlide[] }>('/settings/hero')
  return (res.items ?? [])
    .map((s) => {
      const imageUrl = normalizeMedia(s.imageUrl)
      if (!imageUrl) return null
      const mobileImageUrl = normalizeMedia(s.mobileImageUrl) || imageUrl
      const plaqueRaw = s.plaque
        ? {
            ...s.plaque,
            imageUrl: normalizeMedia(s.plaque.imageUrl),
          }
        : null
      return {
        id: s.id,
        imageUrl,
        mobileImageUrl,
        href: s.href?.trim() || HERO_SLIDE_HREF_DEFAULT,
        plaque: normalizeHeroPlaque(plaqueRaw),
      }
    })
    .filter((s): s is HeroSlide => s != null)
}

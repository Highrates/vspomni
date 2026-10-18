import type { Category } from '@/types/category'

/**
 * Coming Soon на главной — по slug Nest (Saleor GID больше не матчятся).
 * Нет категории → слот просто пропускается.
 */
export const COMING_SOON_CATEGORY_SLUGS = [
  'iarkaia-i-stilnaia-upakovka', // Парфюм для дома
  'aromasashe', // Саше
] as const

/** @deprecated Saleor GID — не используем */
export const COMING_SOON_CATEGORY_IDS = [
  'Q2F0ZWdvcnk6Mw==',
  'Q2F0ZWdvcnk6NA==',
  'Q2F0ZWdvcnk6Nw==',
] as const

/** @deprecated Saleor GID */
export const GIFT_PACKAGES_CATEGORY_ID = 'Q2F0ZWdvcnk6Ng=='
/** Slug категории «Подарочные пакеты» в Nest (id в Nest — cuid, Saleor GID выше устарел) */
export const GIFT_PACKAGES_CATEGORY_SLUG = 'podarochnye-pakety'

/** Как на странице каталога: саше выше подарочных пакетов */
export function catalogCategorySortKey(c: Category): number {
  const t = `${c.slug} ${c.name}`.toLowerCase()
  if (t.includes('саш') || t.includes('sashe') || t.includes('sachet')) return 0
  if (t.includes('пакет') || t.includes('paket')) return 2
  return 1
}

export function sortCatalogCategories(
  categories: Category[],
  excludeSlug?: string,
): Category[] {
  const list = excludeSlug
    ? categories.filter((c) => c.slug !== excludeSlug)
    : [...categories]
  return list.sort(
    (a, b) =>
      catalogCategorySortKey(a) - catalogCategorySortKey(b) ||
      a.name.localeCompare(b.name, 'ru'),
  )
}

export function pickComingSoonCategories(categories: Category[]): Category[] {
  const bySlug = new Map(categories.map((c) => [c.slug, c]))
  const fromSlugs = COMING_SOON_CATEGORY_SLUGS.map((slug) => bySlug.get(slug)).filter(
    (c): c is Category => Boolean(c),
  )
  if (fromSlugs.length > 0) return fromSlugs

  // Fallback: до 2 категорий с обложкой, кроме основных витрин
  const exclude = new Set<string>([
    GIFT_PACKAGES_CATEGORY_SLUG,
    'diffuzory',
    'podarochnye-pakety',
  ])
  return categories
    .filter(
      (c) =>
        Boolean(c.backgroundImage) &&
        !exclude.has(c.slug) &&
        !/krem|tush|rumyan|balzam|kosmetik/i.test(c.slug),
    )
    .slice(0, 2)
}

export function pickGiftPackagesCategory(
  categories: Category[],
): Category | null {
  return (
    categories.find((category) => category.id === GIFT_PACKAGES_CATEGORY_ID) ??
    categories.find((category) => category.slug === GIFT_PACKAGES_CATEGORY_SLUG) ??
    null
  )
}

import type { Category } from '@/types/category'

export const COMING_SOON_CATEGORY_IDS = [
  'Q2F0ZWdvcnk6Mw==',
  'Q2F0ZWdvcnk6NA==',
  'Q2F0ZWdvcnk6Nw==',
] as const

export const GIFT_PACKAGES_CATEGORY_ID = 'Q2F0ZWdvcnk6Ng=='

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
  return COMING_SOON_CATEGORY_IDS.map((id) =>
    categories.find((category) => category.id === id),
  ).filter((category): category is Category => Boolean(category))
}

export function pickGiftPackagesCategory(
  categories: Category[],
): Category | null {
  return (
    categories.find((category) => category.id === GIFT_PACKAGES_CATEGORY_ID) ??
    null
  )
}

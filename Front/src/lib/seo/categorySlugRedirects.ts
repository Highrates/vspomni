/**
 * 301-редиректы при смене slug категории в Saleor.
 * После правки идентификатора в админке добавьте сюда пару oldSlug → newSlug
 * (тот, что реально лежит в Saleor сейчас — destination).
 *
 * «Парфюм для дома»: в CMS slug всё ещё iarkaia-i-stilnaia-upakovka.
 * Ранее ошибочно редиректили на parfium-dlia-doma (категории нет → пустая страница).
 */
export const CATEGORY_SLUG_REDIRECTS: Record<string, string> = {
  'parfium-dlia-doma': 'iarkaia-i-stilnaia-upakovka',
}

export function resolveCategorySlugRedirect(slug: string): string | null {
  const trimmed = slug.trim()
  return CATEGORY_SLUG_REDIRECTS[trimmed] ?? null
}

/** Путь 301-редиректа для /category/{slug} или /category/{slug}/{productSlug} */
export function categorySlugRedirectPath(
  slug: string,
  productSlug?: string,
): string | null {
  const newSlug = resolveCategorySlugRedirect(slug)
  if (!newSlug) return null

  if (productSlug?.trim()) {
    return `/category/${encodeURIComponent(newSlug)}/${encodeURIComponent(productSlug.trim())}`
  }

  return `/category/${encodeURIComponent(newSlug)}`
}

/** Правила для next.config redirects() */
export function buildCategorySlugRedirectRules(): {
  source: string
  destination: string
  permanent: true
}[] {
  const rules: {
    source: string
    destination: string
    permanent: true
  }[] = []

  for (const [oldSlug, newSlug] of Object.entries(CATEGORY_SLUG_REDIRECTS)) {
    rules.push({
      source: `/category/${oldSlug}`,
      destination: `/category/${newSlug}`,
      permanent: true,
    })
    rules.push({
      source: `/category/${oldSlug}/:productSlug`,
      destination: `/category/${newSlug}/:productSlug`,
      permanent: true,
    })
  }

  return rules
}

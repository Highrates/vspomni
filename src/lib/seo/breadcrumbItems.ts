import type { BreadcrumbItemInput } from '@/lib/seo/breadcrumbJsonLd'

export const BREADCRUMB_HOME: BreadcrumbItemInput = {
  name: 'ВСПОМНИ',
  href: '/',
}

export const BREADCRUMB_CATALOG: BreadcrumbItemInput = {
  name: 'Каталог',
  href: '/catalog',
}

export const BREADCRUMB_NEWS: BreadcrumbItemInput = {
  name: 'Новости и публикации',
}

/** Страница /catalog */
export function breadcrumbCatalogPage(): BreadcrumbItemInput[] {
  return [BREADCRUMB_HOME, { name: BREADCRUMB_CATALOG.name }]
}

export function breadcrumbCatalog(currentName: string): BreadcrumbItemInput[] {
  return [BREADCRUMB_HOME, BREADCRUMB_CATALOG, { name: currentName }]
}

export function breadcrumbCategory(
  categoryName: string,
  categorySlug: string,
): BreadcrumbItemInput[] {
  return [
    BREADCRUMB_HOME,
    BREADCRUMB_CATALOG,
    {
      name: categoryName,
      href: `/category/${encodeURIComponent(categorySlug)}`,
    },
  ]
}

export function breadcrumbProduct(
  categoryName: string,
  categorySlug: string,
  productName: string,
): BreadcrumbItemInput[] {
  return [
    ...breadcrumbCategory(categoryName, categorySlug),
    { name: productName },
  ]
}

export function breadcrumbArticle(articleTitle: string): BreadcrumbItemInput[] {
  return [BREADCRUMB_HOME, { name: articleTitle }]
}

export function breadcrumbNews(): BreadcrumbItemInput[] {
  return [BREADCRUMB_HOME, BREADCRUMB_NEWS]
}

export function breadcrumbAroma(aromaTitle: string): BreadcrumbItemInput[] {
  return [
    BREADCRUMB_HOME,
    BREADCRUMB_CATALOG,
    { name: 'Все ароматы', href: '/#vse-aromaty' },
    { name: aromaTitle },
  ]
}

export function breadcrumbSimple(pageName: string): BreadcrumbItemInput[] {
  return [BREADCRUMB_HOME, { name: pageName }]
}

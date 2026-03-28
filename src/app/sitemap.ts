import type { MetadataRoute } from 'next'
import { buildSitemapEntries } from '@/graphql/queries/sitemap.service'

/** Регенерация кэша маршрута ~раз в сутки (динамический sitemap, не статическая заглушка) */
export const revalidate = 86_400

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return buildSitemapEntries()
}

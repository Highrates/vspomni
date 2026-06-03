import type { Metadata } from 'next'
import { buildPageMetadata } from '@/lib/seo/buildPageMetadata'

/** Служебные страницы: не индексируем, но задаём осмысленный title во вкладке */
export function buildPrivatePageMetadata(
  title: string,
  canonicalPath: string,
): Metadata {
  return buildPageMetadata({
    title,
    description: 'Личный раздел интернет-магазина ВСПОМНИ.',
    canonicalPath,
    noIndex: true,
  })
}

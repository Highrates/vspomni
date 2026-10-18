import type { MetadataRoute } from 'next'
import { absoluteUrl, getPublicSiteUrl } from '@/lib/siteUrl'

/** Редко меняется; совпадает с кэшем sitemap по смыслу */
export const revalidate = 86_400

export default function robots(): MetadataRoute.Robots {
  const host = getPublicSiteUrl().replace(/^https?:\/\//, '')

  return {
    rules: [
      {
        userAgent: '*',
        // Явно разрешаем статику Next (стили/чанки/шрифты в /_next/static, оптимизация изображений)
        allow: ['/_next/static/', '/_next/image'],
        disallow: [
          '/api/',
          '/admin',
          '/dashboard',
          '/bitrix/',
          '/wp-admin',
          '/wp-login.php',
          '/profile',
          '/personal',
          '/login',
          '/register',
          '/forgot',
          '/cart',
          '/basket',
          '/checkout',
          '/order',
          '/favorites',
          '/wishlist',
          '/search',
          // Дубли и мусор по GET-параметрам (Google / Яндекс — поиск по префиксу пути)
          '/*?*q=',
          '/*?*query=',
          '/*?*sort=',
          '/*?*order=',
          '/*?*page=',
          '/*?*color=',
          '/*?*aroma=',
          '/*?*utm_',
          '/*?*gclid',
          '/*?*yclid',
          '/*?*PHPSESSID',
        ],
      },
    ],
    host,
    sitemap: absoluteUrl('/sitemap.xml'),
  }
}

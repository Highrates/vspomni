import type { NextConfig } from 'next'
import { buildCategorySlugRedirectRules } from './src/lib/seo/categorySlugRedirects'

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_YANDEX_MAP_API_KEY:
      process.env.NEXT_PUBLIC_YANDEX_MAP_API_KEY,
  },
  async redirects() {
    return [
      ...buildCategorySlugRedirectRules(),
      { source: '/wb', destination: 'https://vspomni.mobz.click/wildberries', permanent: false },
      { source: '/ozon', destination: 'https://vspomni.mobz.click/ozon', permanent: false },
      { source: '/goldapple', destination: 'https://vspomni.mobz.click/goldapple', permanent: false },
      { source: '/lamoda', destination: 'https://vspomni.mobz.click/lamoda', permanent: false },
      { source: '/yandexmarket', destination: 'https://vspomni.mobz.click/yandexmarket', permanent: false },
    ]
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "vspomni.store",
        pathname: "/**",
      }
    ],
  },
}

export default nextConfig

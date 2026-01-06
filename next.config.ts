import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_YANDEX_MAP_API_KEY:
      process.env.NEXT_PUBLIC_YANDEX_MAP_API_KEY,
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

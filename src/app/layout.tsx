import type { Metadata } from 'next'
import { Onest } from 'next/font/google'
import './globals.css'
import YandexMetrika from '@/components/analytics/YandexMetrika'
import ClientChrome from '@/components/layout/ClientChrome'

const onest = Onest({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-onest',
  display: 'swap',
})

const metadataBase = new URL(
  process.env.NEXT_PUBLIC_SITE_URL?.trim() || 'https://vspomni.store',
)

export const metadata: Metadata = {
  metadataBase,
  title: 'ВСПОМНИ.',
  description: 'Ароматы и подарки',
  icons: {
    icon: [{ url: '/favicon1.svg', type: 'image/svg+xml' }],
    shortcut: '/favicon1.svg',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ru" className={onest.variable}>
      <body className="bg-white text-black">
        <YandexMetrika />
        <ClientChrome>{children}</ClientChrome>
      </body>
    </html>
  )
}

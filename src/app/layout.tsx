import { Onest } from 'next/font/google'
import Script from 'next/script'
import './globals.css'
import ClientChrome from '@/components/layout/ClientChrome'

const onest = Onest({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-onest',
  display: 'swap',
})

export const metadata = {
  title: 'ВСПОМНИ.',
  description: 'Ароматы и подарки',
  icons: {
    icon: '/favicon.ico',
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
        <ClientChrome>{children}</ClientChrome>
      </body>
    </html>
  )
}

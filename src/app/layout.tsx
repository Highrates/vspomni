'use client'
import Footer from '@/components/layout/Footer'
import Header from '@/components/layout/Header'
import { Onest } from 'next/font/google'
import { usePathname } from 'next/navigation'
import Script from 'next/script'
import './globals.css'
import { ToastContainer } from 'react-toastify'

const onest = Onest({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-onest',
  display: 'swap',
})

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  const hideChrome = [
    '/login',
    '/register',
    '/auth/reset',
    '/checkout',
  ].includes(pathname)

  // Routes that should use overlay variant (transparent header over background images)
  const overlayRoutes = ['/profile', '/catalog']

  const headerVariant = overlayRoutes.includes(pathname) ? 'overlay' : 'default'

  return (
    <html lang="ru" className={onest.variable}>
      <body className="bg-white text-black">
        {!hideChrome && <Header variant={headerVariant} />}
        <main
          className={`${!hideChrome ? 'pt-[86px]' : ''} w-full min-h-screen`}
        >
          <div className="container">{children}</div>
        </main>
        <ToastContainer pauseOnHover={false} theme="dark" />
        {!hideChrome && <Footer />}
      </body>
    </html>
  )
}

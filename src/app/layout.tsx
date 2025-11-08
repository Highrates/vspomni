'use client'
import Footer from '@/components/layout/Footer'
import Header from '@/components/layout/Header'
import { Onest } from 'next/font/google'
import { usePathname } from 'next/navigation'
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

  return (
    <html lang="ru" className={onest.variable}>
      <body className="bg-white text-black">
        {!hideChrome && <Header />}
        <main
          className={`${!hideChrome ? 'pt-[80px]' : ''} w-full min-h-screen`}
        >
          <div className="container">{children}</div>
        </main>

        <ToastContainer pauseOnHover={false} theme='dark' />
        {!hideChrome && <Footer />}
      </body>
    </html>
  )
}

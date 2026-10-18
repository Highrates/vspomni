import type { Metadata } from 'next'
import { buildPrivatePageMetadata } from '@/lib/seo/privatePageMetadata'

export const metadata: Metadata = buildPrivatePageMetadata(
  'Вход',
  '/login',
)

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}

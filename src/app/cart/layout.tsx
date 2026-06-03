import type { Metadata } from 'next'
import { buildPrivatePageMetadata } from '@/lib/seo/privatePageMetadata'

export const metadata: Metadata = buildPrivatePageMetadata(
  'Корзина',
  '/cart',
)

export default function CartLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}

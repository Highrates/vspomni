import type { Metadata } from 'next'
import { buildPrivatePageMetadata } from '@/lib/seo/privatePageMetadata'

export const metadata: Metadata = buildPrivatePageMetadata(
  'Оформление заказа',
  '/checkout',
)

export default function CheckoutLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}

import type { Metadata } from 'next'
import { buildPrivatePageMetadata } from '@/lib/seo/privatePageMetadata'

export const metadata: Metadata = buildPrivatePageMetadata(
  'Заказ оформлен',
  '/checkout/success',
)

export default function CheckoutSuccessLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}

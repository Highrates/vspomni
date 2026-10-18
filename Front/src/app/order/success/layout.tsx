import type { Metadata } from 'next'
import { buildPrivatePageMetadata } from '@/lib/seo/privatePageMetadata'

export const metadata: Metadata = buildPrivatePageMetadata(
  'Заказ оформлен',
  '/order/success',
)

export default function OrderSuccessLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}

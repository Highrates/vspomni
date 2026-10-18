import type { Metadata } from 'next'
import { buildPrivatePageMetadata } from '@/lib/seo/privatePageMetadata'

export const metadata: Metadata = buildPrivatePageMetadata(
  'Личный кабинет',
  '/profile',
)

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}

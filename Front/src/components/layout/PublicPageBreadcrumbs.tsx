import Breadcrumbs from '@/components/layout/Breadcrumbs'
import type { BreadcrumbItemInput } from '@/lib/seo/breadcrumbJsonLd'

type Props = {
  items: BreadcrumbItemInput[]
  currentPath: string
  /** full-width container как на каталоге */
  variant?: 'default' | 'container' | 'article'
  className?: string
  tone?: 'default' | 'light'
}

const variantClass: Record<NonNullable<Props['variant']>, string> = {
  default: 'px-2 sm:px-4 pt-2 sm:pt-3 md:pt-4',
  container: 'px-3 sm:px-4 md:px-0 pt-4 container',
  article: 'max-w-3xl mx-auto px-4 sm:px-6 lg:px-0 pt-4',
}

export default function PublicPageBreadcrumbs({
  items,
  currentPath,
  variant = 'default',
  className = '',
  tone = 'default',
}: Props) {
  return (
    <div className={`${variantClass[variant]} ${className}`.trim()}>
      <Breadcrumbs items={items} currentPath={currentPath} tone={tone} />
    </div>
  )
}

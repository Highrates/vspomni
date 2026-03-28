import Link from 'next/link'
import { breadcrumbJsonLdObject } from '@/lib/seo/breadcrumbJsonLd'
import type { BreadcrumbItemInput } from '@/lib/seo/breadcrumbJsonLd'

type Props = {
  items: BreadcrumbItemInput[]
  /** Путь текущей страницы для последнего ListItem.item в JSON-LD */
  currentPath: string
  className?: string
}

/**
 * Хлебные крошки + JSON-LD BreadcrumbList.
 * Последний элемент без ссылки (только текст). Разметка — JSON-LD (допустимый вариант для Google).
 */
export default function Breadcrumbs({
  items,
  currentPath,
  className = '',
}: Props) {
  if (!items.length) return null

  const jsonLd = breadcrumbJsonLdObject(items, currentPath)

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd),
        }}
      />
      <nav
        aria-label="Хлебные крошки"
        className={`w-full min-w-0 mb-3 sm:mb-4 ${className}`}
      >
        <ol
          className="flex flex-nowrap md:flex-wrap items-center gap-x-2 gap-y-1 overflow-x-auto overflow-y-hidden max-w-full pb-0.5 text-[13px] sm:text-sm text-black/70 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        >
          {items.map((item, index) => {
            const isLast = index === items.length - 1
            return (
              <li
                key={`${item.name}-${index}`}
                className="flex shrink-0 items-center gap-x-2"
              >
                {index > 0 && (
                  <span className="text-black/40 select-none" aria-hidden>
                    /
                  </span>
                )}
                {isLast || !item.href ? (
                  <span className="font-medium text-black whitespace-nowrap">
                    {item.name}
                  </span>
                ) : (
                  <Link
                    href={item.href}
                    className="hover:text-black transition-colors whitespace-nowrap shrink-0"
                  >
                    {item.name}
                  </Link>
                )}
              </li>
            )
          })}
        </ol>
      </nav>
    </>
  )
}

import Link from 'next/link'
import { breadcrumbJsonLdObject } from '@/lib/seo/breadcrumbJsonLd'
import type { BreadcrumbItemInput } from '@/lib/seo/breadcrumbJsonLd'

type Props = {
  items: BreadcrumbItemInput[]
  /** Путь текущей страницы для последнего ListItem.item в JSON-LD */
  currentPath: string
  className?: string
  /** Светлый текст для страниц с тёмным фоном (каталог, профиль) */
  tone?: 'default' | 'light'
}

/**
 * Хлебные крошки + JSON-LD BreadcrumbList.
 * Последний элемент без ссылки (только текст). Разметка — JSON-LD (допустимый вариант для Google).
 */
export default function Breadcrumbs({
  items,
  currentPath,
  className = '',
  tone = 'default',
}: Props) {
  if (!items.length) return null

  const jsonLd = breadcrumbJsonLdObject(items, currentPath)
  const isLight = tone === 'light'

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
        className={`w-full min-w-0 mb-2 sm:mb-3 ${className} ${
          isLight ? 'drop-shadow-md' : ''
        }`}
      >
        <ol
          className={`flex flex-nowrap md:flex-wrap items-center gap-x-2 gap-y-1 overflow-x-auto overflow-y-hidden max-w-full pb-0.5 text-[13px] sm:text-sm [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden ${
            isLight ? 'text-white/80' : 'text-black/70'
          }`}
        >
          {items.map((item, index) => {
            const isLast = index === items.length - 1
            return (
              <li
                key={`${item.name}-${index}`}
                className="flex shrink-0 items-center gap-x-2"
              >
                {index > 0 && (
                  <span
                    className={`select-none ${isLight ? 'text-white/40' : 'text-black/40'}`}
                    aria-hidden
                  >
                    /
                  </span>
                )}
                {isLast || !item.href ? (
                  <span
                    className={`font-medium whitespace-nowrap ${
                      isLight ? 'text-white' : 'text-black'
                    }`}
                  >
                    {item.name}
                  </span>
                ) : (
                  <Link
                    href={item.href}
                    className={`transition-colors whitespace-nowrap shrink-0 ${
                      isLight
                        ? 'text-white/80 hover:text-white'
                        : 'hover:text-black'
                    }`}
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

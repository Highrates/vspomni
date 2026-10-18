import Link from 'next/link'
import { SITE_PRIMARY_NAV } from '@/lib/seo/siteNav'

export default function Navigation() {
  return (
    <nav
      className="hidden md:flex items-center gap-6 lg:gap-8 text-[16px] font-medium text-black/80"
      aria-label="Основное меню"
    >
      {SITE_PRIMARY_NAV.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="hover:text-black transition-colors whitespace-nowrap"
        >
          {item.label}
        </Link>
      ))}
      <Link
        href="https://t.me/vspomni_corp"
        target="_blank"
        rel="noopener noreferrer"
        className="hover:text-black transition-colors"
      >
        Связаться
      </Link>
    </nav>
  )
}

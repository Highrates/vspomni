import Link from 'next/link'

export default function Navigation() {
  return (
    <nav className="hidden md:flex items-center gap-8 text-[16px] font-medium text-black/80">
      <Link href="#" className="hover:text-black transition-colors">
        Каталог
      </Link>
      <Link href="#" className="hover:text-black transition-colors">
        Партнеры
      </Link>
      <Link href="#" className="hover:text-black transition-colors">
        Ароматы
      </Link>
      <Link href="#" className="hover:text-black transition-colors">
        Блог
      </Link>
      <Link href="#" className="hover:text-black transition-colors">
        Связаться
      </Link>
      <span className="text-black font-semibold">(3)</span>
    </nav>
  )
}

'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, User, ShoppingBag, Send, Menu, X } from 'lucide-react'
import ModalCart from '../modals/CartModal'
import SearchResults from '../search/SearchResults'
import { useCartStore } from '@/stores/useCart'
import { useAuthStore } from '@/stores/useAuth'
import { searchProducts } from '@/graphql/queries/search.service'
import { ProductNode } from '@/graphql/types/product.types'
import Image from 'next/image'

interface HeaderProps {
  variant: 'default' | 'overlay'
}

export default function Header({ variant = 'default' }: HeaderProps) {
  const [showCart, setShowCart] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<ProductNode[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  
  const cartQuantity = useCartStore((state) => state.items.length)
  const { isAuthenticated } = useAuthStore()
  const router = useRouter()

  const searchRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const debounceTimerRef = useRef<NodeJS.Timeout>(null)

  const isOverlay = variant === 'overlay'

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setSearchOpen(false)
        setSearchQuery('')
        setSearchResults([])
      }
    }
    if (searchOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      searchInputRef.current?.focus()
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [searchOpen])

  useEffect(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)

    if (searchQuery.trim().length === 0) {
      setSearchResults([])
      return
    }

    if (searchQuery.trim().length < 2) return

    setSearchLoading(true)
    debounceTimerRef.current = setTimeout(async () => {
      try {
        const results = await searchProducts(searchQuery, 10)
        setSearchResults(results)
      } catch (error) {
        setSearchResults([])
      } finally {
        setSearchLoading(false)
      }
    }, 300)

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    }
  }, [searchQuery])

  const handleProfile = () => {
    isAuthenticated ? router.push('/profile') : router.push('/login')
  }

  const getHeaderStyles = () => {
    if (isOverlay) {
      return scrolled
        ? 'bg-white/90 backdrop-blur-md shadow-sm border-b border-black/10'
        : 'bg-transparent'
    }
    return scrolled
      ? 'bg-white/90 backdrop-blur-md shadow-sm border-b border-black/10'
      : 'bg-white'
  }

  const getMenuBackground = () => {
    if (isOverlay && !scrolled) {
      return 'bg-white/20 backdrop-blur-sm border-white/30 z-10'
    }
    return 'bg-white border-black/15'
  }

  const iconColor = isOverlay && !scrolled ? '#FFFFFF' : '#000000'

  return (
    <>
      {isOverlay && (
        <div className="m-3 bg-[url('/images/catalogTop.png')] p-10 bg-cover bg-center top-0 left-0 right-0 h-[511px] z-0 pointer-events-none rounded-none sm:rounded-3xl max-w-[1679px] mx-auto"></div>
      )}

      <motion.header
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className={`fixed top-0 left-0 w-full pt-3 z-50 transition-all duration-300 ${getHeaderStyles()}`}
        style={{ height: '86px' }}
      >
        <div className="flex items-center justify-between h-full px-4 sm:px-6 md:px-[33px] container">
          <Link
            href="/"
            className="text-base sm:text-[18px] font-semibold tracking-wide"
          >
            <Image
              src={'/logo/logo-vspomni.svg'}
              alt="logo"
              width={100}
              height={20}
              className={isOverlay && !scrolled ? 'brightness-0 invert' : ''}
            />
          </Link>

          {/* Desktop Menu */}
          <div
            className={`hidden md:flex items-center justify-between rounded-full border px-4 lg:px-8 ${getMenuBackground()}`}
            style={{ maxWidth: '777px', width: '100%', height: '46px' }}
          >
            <nav
              className={`flex items-center gap-4 lg:gap-8 text-sm lg:text-[15px] font-medium ${isOverlay && !scrolled ? 'text-white' : 'text-black/80'}`}
            >
              <Link href="/catalog" className="hover:opacity-80 transition whitespace-nowrap">Каталог</Link>
              <Link href="/partners" className="hover:opacity-80 transition whitespace-nowrap">Партнеры</Link>
              <Link href="/category/diffuzory" className="hover:opacity-80 transition whitespace-nowrap">Ароматы</Link>
              <Link href="/news" className="hover:opacity-80 transition whitespace-nowrap">Блог</Link>
              <Link
                href="https://t.me/vspomni_nice"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 hover:opacity-80 transition whitespace-nowrap"
              >
                <Send size={16} strokeWidth={1.8} color="#229ED9" />
                <span className="hidden lg:inline">Связаться</span>
              </Link>
            </nav>

            <div
              className={`flex items-center gap-3 border-l pl-11 lg:gap-5 ml-4 lg:space-x-5 ${isOverlay && !scrolled ? 'border-white/50' : 'border-black/50'}`}
            >
              <button
                aria-label="Поиск"
                onClick={() => setSearchOpen((v) => !v)}
                className="hover:opacity-70 transition-opacity"
              >
                <Search size={22} strokeWidth={1.8} color={iconColor} />
              </button>

              <button
                aria-label="Корзина"
                className="relative hover:opacity-70 transition-opacity cursor-pointer"
                onClick={() => setShowCart(!showCart)}
              >
                <ShoppingBag size={22} strokeWidth={1.8} color={iconColor} />
                <span className={`absolute -top-1 -right-4 text-[12px] font-semibold ${isOverlay && !scrolled ? 'text-white' : 'text-black'}`}>
                  ({cartQuantity})
                </span>
              </button>

              <button
                aria-label="Профиль"
                className="hover:opacity-70 transition-opacity cursor-pointer"
                onClick={handleProfile}
              >
                <User size={22} strokeWidth={1.8} color={iconColor} />
              </button>
            </div>
          </div>

          {/* Mobile Icons */}
          <div className="md:hidden flex p-2 items-center gap-5">
            <Search
              size={20}
              strokeWidth={1.8}
              color={iconColor}
              onClick={() => {
                setSearchOpen((v) => !v)
                setMenuOpen(false)
              }}
            />
            <div
              className="relative cursor-pointer"
              onClick={() => setShowCart(!showCart)}
            >
              <ShoppingBag size={20} strokeWidth={1.8} color={iconColor} />
              <span className={`absolute -top-1 -right-3 text-[11px] font-semibold ${isOverlay && !scrolled ? 'text-white' : 'text-black'}`}>
                ({cartQuantity})
              </span>
            </div>
            <button
              className="md:hidden p-2 hover:opacity-70 transition-opacity"
              onClick={() => {
                setMenuOpen((v) => !v)
                setSearchOpen(false)
              }}
              aria-label="Меню"
            >
              {menuOpen ? (
                <X size={24} strokeWidth={1.8} color={iconColor} />
              ) : (
                <Menu size={24} strokeWidth={1.8} color={iconColor} />
              )}
            </button>
          </div>
        </div>

        {/* Global Search Dropdown (Works on Mobile & Desktop) */}
        <AnimatePresence>
          {searchOpen && (
            <motion.div
              ref={searchRef}
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.25 }}
              className="absolute top-[86px] left-0 w-full bg-white border-t border-black/10 shadow-md"
            >
              <div className="container px-4 sm:px-6 md:px-8 py-4 relative z-50">
                <div className="flex items-center justify-between gap-2">
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Поиск по каталогу..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full text-sm sm:text-md px-3 sm:px-4 py-2 border border-black/20 rounded-full outline-none focus:border-black transition"
                    autoFocus
                  />
                  <button
                    onClick={() => {
                      setSearchOpen(false)
                      setSearchQuery('')
                      setSearchResults([])
                    }}
                    className="ml-2 sm:ml-4 p-2 hover:bg-black/5 rounded-full transition shrink-0"
                    aria-label="Закрыть поиск"
                  >
                    <X size={20} strokeWidth={1.8} />
                  </button>
                </div>
                {(searchQuery.length >= 2 || searchResults.length > 0 || searchLoading) && (
                  <SearchResults
                    products={searchResults}
                    loading={searchLoading}
                    onClose={() => {
                      setSearchOpen(false)
                      setSearchQuery('')
                      setSearchResults([])
                    }}
                  />
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mobile Menu Dropdown */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
              className={`absolute top-[86px] left-0 w-full border-t shadow-md md:hidden ${
                isOverlay && !scrolled
                  ? 'bg-white/95 backdrop-blur-md border-white/20 text-black'
                  : 'bg-white border-black/10'
              }`}
            >
              <nav className="flex flex-col px-6 py-5 text-md font-medium gap-4">
                <Link href="/catalog" onClick={() => setMenuOpen(false)}>Каталог</Link>
                <Link href="/partners" onClick={() => setMenuOpen(false)}>Партнеры</Link>
                <Link href="/category/diffuzory" onClick={() => setMenuOpen(false)}>Ароматы</Link>
                <Link href="/news" onClick={() => setMenuOpen(false)}>Блог</Link>
                <Link
                  href="https://t.me/vspomni_nice"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-1"
                >
                  <Send size={16} strokeWidth={1.8} color="#229ED9" />
                  Связаться
                </Link>

                <div className={`flex items-center gap-6 pt-4 border-t mt-4 ${isOverlay && !scrolled ? 'border-white/20' : 'border-black/10'}`}>
                  <User size={20} strokeWidth={1.8} color="#000000" onClick={handleProfile} />
                </div>
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>

      <ModalCart visible={showCart} onClose={() => setShowCart(false)} />
    </>
  )
}
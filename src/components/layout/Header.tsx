'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, User, ShoppingBag, Send, Menu, X } from 'lucide-react'
import ModalCart from '../modals/CartModal'
import { useCartStore } from '@/stores/useCart'
import { useAuthStore } from '@/stores/useAuth';
import { profile } from 'console'

export default function Header() {
  const [showCart, setShowCart] = useState(false);
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const cartQuantity = useCartStore((state) => state.items.length)

  const searchRef = useRef<HTMLDivElement>(null)

  const { isAuthenticated } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setSearchOpen(false)
      }
    }
    if (searchOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [searchOpen])

  const handleProfile = ()=>{
    isAuthenticated ? router.push('/profile') : router.push('/login')
  }

  return (
    <>
      <motion.header
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${scrolled
          ? 'bg-white/90 backdrop-blur-md shadow-sm border-b border-black/10'
          : 'bg-white'
          }`}
        style={{ height: '86px' }}
      >
        <div className="flex items-center justify-between h-full px-[33px] container">
          {/* ЛОГОТИП */}
          <Link
            href="/"
            className="text-[18px] font-semibold text-black tracking-wide"
          >
            вспомни<span className="text-black">.</span>
          </Link>

          {/* --- ДЕСКТОПНОЕ МЕНЮ --- */}
          <div
            className="hidden md:flex items-center justify-between rounded-full border border-black/15 bg-white px-8"
            style={{ width: '777px', height: '46px' }}
          >
            <nav className="flex items-center gap-8 text-[15px] font-medium text-black/80">
              <Link href="/catalog" className="hover:text-black transition">
                Каталог
              </Link>
              <Link href="#" className="hover:text-black transition">
                Партнеры
              </Link>
              <Link href="#" className="hover:text-black transition">
                Ароматы
              </Link>
              <Link href="#" className="hover:text-black transition">
                Блог
              </Link>
              <Link
                href="#"
                className="flex items-center gap-1 hover:text-black transition"
              >
                <Send size={16} strokeWidth={1.8} color="#229ED9" />
                Связаться
              </Link>
            </nav>

            <div className="flex items-center gap-5 ml-6">
              <button
                aria-label="Поиск"
                onClick={() => setSearchOpen((v) => !v)}
                className="hover:opacity-70 transition-opacity"
              >
                <Search size={22} strokeWidth={1.8} color="#000000" />
              </button>

              <button
                aria-label="Корзина"
                className="relative hover:opacity-70 transition-opacity cursor-pointer"
                onClick={() => setShowCart(!showCart)}
              >
                <ShoppingBag size={22} strokeWidth={1.8} color="#000000" />
                <span className="absolute -top-1 -right-4 text-[12px] font-semibold">
                 ({cartQuantity})
                </span>
              </button>

              <button
                aria-label="Профиль"
                className="hover:opacity-70 transition-opacity"
                onClick={handleProfile}
              >
                <User size={22} strokeWidth={1.8} color="#000000" />
              </button>
            </div>

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
                  <div className="container px-8 py-4 flex items-center justify-between">
                    <input
                      type="text"
                      placeholder="Поиск по каталогу..."
                      className="w-full text-[16px] px-4 py-2 border border-black/20 rounded-full outline-none focus:border-black transition"
                      autoFocus
                    />
                    <button
                      onClick={() => setSearchOpen(false)}
                      className="ml-4 p-2 hover:bg-black/5 rounded-full transition"
                      aria-label="Закрыть поиск"
                    >
                      <X size={20} strokeWidth={1.8} />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button
            className="md:hidden p-2 hover:opacity-70 transition-opacity"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Меню"
          >
            {menuOpen ? (
              <X size={24} strokeWidth={1.8} color="#000" />
            ) : (
              <Menu size={24} strokeWidth={1.8} color="#000" />
            )}
          </button>
        </div>
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
              className="absolute top-[86px] left-0 w-full bg-white border-t border-black/10 shadow-md md:hidden"
            >
              <nav className="flex flex-col px-6 py-5 text-md font-medium text-black/80 gap-4">
                <Link href="/catalog" onClick={() => setMenuOpen(false)}>
                  Каталог
                </Link>
                <Link href="#" onClick={() => setMenuOpen(false)}>
                  Партнеры
                </Link>
                <Link href="#" onClick={() => setMenuOpen(false)}>
                  Ароматы
                </Link>
                <Link href="#" onClick={() => setMenuOpen(false)}>
                  Блог
                </Link>
                <Link
                  href="#"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-1"
                >
                  <Send size={16} strokeWidth={1.8} color="#229ED9" />
                  Связаться
                </Link>

                <div className="flex items-center gap-6 pt-4 border-t border-black/10 mt-4">
                  <Search size={20} strokeWidth={1.8} color="#000000" />
                  <ShoppingBag size={20} strokeWidth={1.8} color="#000000" />
                  <User size={20} strokeWidth={1.8} color="#000000" />
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

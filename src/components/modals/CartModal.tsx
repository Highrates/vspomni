'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useCartStore } from '@/stores/useCart'
import { useAuthStore } from '@/stores/useAuth'
import CartCard from '../cart/CartCard'
import { formatCurrency } from '@/lib/functions'
import { CustomButton as Button } from '../common/CustomButton'
import { motion } from 'framer-motion'
import { CartPromoCode } from './CartPromoCode'

interface ModalCartProps {
  visible: boolean
  onClose: () => void
}

export default function ModalCart({ visible, onClose }: ModalCartProps) {
  const [show, setShow] = useState(visible)
  const { isAuthenticated } = useAuthStore()
  const {
    items,
    totalItems,
    totalPrice,
    discount,
    appliedPromoCode,
    decreaseQuantity,
    increaseQuantity,
    removeItem,
  } = useCartStore()

  const router = useRouter()

  useEffect(() => {
    if (visible) {
      setShow(true)
    } else {
      const timeout = setTimeout(() => setShow(false), 300)
      return () => clearTimeout(timeout)
    }
  }, [visible])

  // закрытие по ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (visible) window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [visible, onClose])

  const checkout = () => {
    isAuthenticated ? router.push('/checkout') : router.push('/login')
  }

  if (!show) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Фон */}
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-black/40 backdrop-blur-sm cursor-pointer transition-opacity duration-300 ${
          visible ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Модалка */}
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: visible ? 0 : '100%' }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className="relative w-full md:w-[600px] h-full bg-white shadow-xl rounded-none md:rounded-tl-3xl md:rounded-l-3xl flex flex-col"
      >
        {/* Заголовок */}
        <div className="max-sm:p-4 p-8 border-b border-black/10 flex items-center justify-between shrink-0">
          <h1 className="text-2xl font-semibold">Корзина</h1>
          <button
            onClick={onClose}
            className="hover:border-black border border-transparent rounded-full p-1 duration-300"
          >
            <Image src="/close.png" alt="close" width={24} height={24} />
          </button>
        </div>

        {/* Контент */}
        <div className="flex-1 overflow-y-auto max-sm:px-2 px-8 py-6 space-y-3">
          {items.length > 0 ? (
            <>
              {items.map((item) => (
                <CartCard
                  key={item.id}
                  product={item.product}
                  quantity={item.quantity}
                  size={item.size}
                  onDecrease={() => decreaseQuantity(item.id)}
                  onIncrease={() => increaseQuantity(item.id)}
                  onRemove={() => removeItem(item.id)}
                />
              ))}
              <div className="relative">
                <CartPromoCode />
              </div>
            </>
          ) : (
            <p className="text-black/60 text-center py-10">Корзина пуста</p>
          )}
        </div>

        <div className="max-sm:p-4 p-8 border-t border-black/10 shrink-0">
          {appliedPromoCode && discount > 0 && (
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Скидка ({appliedPromoCode})</span>
              <span className="text-sm text-red-600 font-semibold">
                -{formatCurrency((items.reduce((sum, i) => sum + i.product.price * i.quantity, 0) * discount) / 100)} ₽
              </span>
            </div>
          )}
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">
              Сумма • {totalItems} {totalItems === 1 ? 'товар' : 'товара'}
            </h2>
            <p className="font-semibold">{formatCurrency(totalPrice)} ₽</p>
          </div>

          <Button className="w-full justify-center" onClick={checkout} disabled={!Boolean(totalItems>0 )}>
            <h2 className="font-semibold">Оформить заказ</h2>
          </Button>
        </div>
      </motion.div>
    </div>
  )
}

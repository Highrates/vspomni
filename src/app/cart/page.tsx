'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCartStore } from '@/stores/useCart'
import { useAuthStore } from '@/stores/useAuth'
import CartCard from '@/components/cart/CartCard'
import { CartPromoCode } from '@/components/modals/CartPromoCode'
import { formatCurrency } from '@/lib/functions'
import { CustomButton as Button } from '@/components/common/CustomButton'

export default function CartPage() {
  const router = useRouter()
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

  const handleCheckout = () => {
    if (totalItems <= 0) return
    router.push(isAuthenticated ? '/checkout' : '/login?next=/checkout')
  }

  return (
    <main className="container mx-auto w-full max-w-3xl px-4 sm:px-6 py-8 sm:py-12">
      <div className="mb-6 sm:mb-8 flex items-center justify-between gap-4">
        <h1 className="text-2xl sm:text-3xl font-semibold">Корзина</h1>
        <Link
          href="/"
          className="text-sm text-black/60 hover:text-black underline underline-offset-2"
        >
          Продолжить покупки
        </Link>
      </div>

      <div className="space-y-3 mb-6">
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
            <CartPromoCode />
          </>
        ) : (
          <p className="text-black/60 text-center py-16">Корзина пуста</p>
        )}
      </div>

      {items.length > 0 ? (
        <div className="rounded-2xl border border-black/10 p-4 sm:p-6 space-y-4">
          {appliedPromoCode && discount > 0 ? (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Скидка ({appliedPromoCode})</span>
              <span className="text-red-600 font-semibold">
                -
                {formatCurrency(
                  (items.reduce((sum, i) => sum + i.product.price * i.quantity, 0) *
                    discount) /
                    100,
                )}{' '}
                ₽
              </span>
            </div>
          ) : null}

          <div className="flex items-center justify-between">
            <span className="font-semibold">
              Сумма · {totalItems} {totalItems === 1 ? 'товар' : 'товара'}
            </span>
            <span className="font-semibold">{formatCurrency(totalPrice)} ₽</span>
          </div>

          <Button
            className="w-full justify-center"
            onClick={handleCheckout}
            disabled={totalItems <= 0}
          >
            Оформить заказ
          </Button>
        </div>
      ) : (
        <div className="text-center">
          <Link
            href="/"
            className="inline-flex h-11 items-center rounded-full border border-black px-8 text-sm font-semibold hover:bg-black hover:text-white transition-colors"
          >
            Перейти в каталог
          </Link>
        </div>
      )}
    </main>
  )
}

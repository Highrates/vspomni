'use client'

import { PromoCodeInput } from './PromoCodeInput'
import { Summary } from './Summary'
import { useCartStore } from '@/stores/useCart'
import CartCard from '../cart/CartCard'


export default function OrderSummary() {
  const {
    items,
    totalItems,
    totalPrice,
    discount,
    discountAmount,
    discountType,
    appliedPromoCode,
    decreaseQuantity,
    increaseQuantity,
    removeItem,
  } = useCartStore()

  const subtotal = items.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0,
  )

  const effectiveDiscountAmount =
    typeof discountAmount === 'number'
      ? discountAmount
      : discount > 0
        ? (subtotal * discount) / 100
        : 0
  return (
    <section className="select-none">
      <h2 className="text-2xl sm:text-3xl lg:text-[32px] leading-tight font-bold mb-8 sm:mb-12 lg:mb-20 mt-4 sm:mt-6 lg:mt-8">
        ВСПОМНИ.
      </h2>

      <div className='flex flex-col gap-3 sm:gap-4'>

        {items.length > 0 ? (
                    items.map((item) => (
                      <CartCard
                        key={item.id}
                        product={item.product}
                        quantity={item.quantity}
                        size={item.size}
                        onDecrease={() => decreaseQuantity(item.id)}
                        onIncrease={() => increaseQuantity(item.id)}
                        onRemove={() => removeItem(item.id)}
                      />
                    ))
                  ) : (
                    <p className="text-black/60 text-center py-10">Корзина пуста</p>
                  )}
      </div>

      <PromoCodeInput checkoutId='sample-checkout-id' />

      <Summary
        total={totalPrice}
        subtotal={subtotal}
        discount={effectiveDiscountAmount}
        promoDiscount={effectiveDiscountAmount}
        appliedPromoCode={appliedPromoCode}
        discountPercent={discount}
        totalItems={totalItems}
        discountType={discountType}
      />
    </section>
  )
}

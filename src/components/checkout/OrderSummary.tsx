'use client'

import { PromoCodeInput } from './PromoCodeInput'
import { Summary } from './Summary'
import { useCartStore } from '@/stores/useCart'
import CartCard from '../cart/CartCard'
import { cartSubtotal, describePromo } from '@/lib/promo'


export default function OrderSummary() {
  const {
    items,
    totalItems,
    totalPrice,
    discountType,
    discountValueType,
    discountValue,
    promoScope,
    appliedPromoCode,
    promoItemsDiscount,
    shippingPrice,
    shippingLoading,
    shippingCarrier,
    decreaseQuantity,
    increaseQuantity,
    removeItem,
  } = useCartStore()

  const subtotal = cartSubtotal(items)
  const promoLabel = describePromo({
    appliedPromoCode,
    discountType,
    discountValueType,
    discountValue,
    promoScope,
  })

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

      <PromoCodeInput />

      <Summary
        total={totalPrice}
        subtotal={subtotal}
        itemsDiscount={promoItemsDiscount}
        promoLabel={promoLabel}
        totalItems={totalItems}
        shipping={shippingPrice}
        shippingLoading={shippingLoading}
        shippingCarrier={shippingCarrier ?? null}
      />
    </section>
  )
}

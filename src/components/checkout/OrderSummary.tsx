'use client'

import { useState } from 'react'
import { ProductCard } from './ProductCard'
import { PromoCodeInput } from './PromoCodeInput'
import { Summary } from './Summary'

export default function OrderSummary() {
  const [total] = useState('50 250 ₽')
  const [discount] = useState('-800 ₽')
  const [promoDiscount] = useState('-1 000 ₽')

  const products = [
    {
      id: 1,
      title: 'Кашемир и слива',
      volume: '100 мл',
      quantity: '1 шт.',
      oldPrice: '15 250 ₽',
      newPrice: '12 890 ₽',
      imageUrl: '/images/product1.png',
    },
    {
      id: 2,
      title: 'Кашемир и слива',
      volume: '100 мл',
      quantity: '1 шт.',
      oldPrice: '15 250 ₽',
      newPrice: '12 890 ₽',
      imageUrl: '/images/product2.png',
    },
    {
      id: 3,
      title: 'Кашемир и слива',
      volume: '100 мл',
      quantity: '1 шт.',
      oldPrice: '15 250 ₽',
      newPrice: '12 890 ₽',
      imageUrl: '/images/product1.png',
    },
  ]

  return (
    <section className="select-none">
      <h2 className="text-[32px] leading-tight font-bold mb-20 mt-8">
        ВСПОМНИ.
      </h2>

      <div>
        {products.map((product) => (
          <ProductCard key={product.id} {...product} />
        ))}
      </div>

      <PromoCodeInput />

      <Summary
        total={total}
        discount={discount}
        promoDiscount={promoDiscount}
      />
    </section>
  )
}

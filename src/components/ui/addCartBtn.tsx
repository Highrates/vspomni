'use client'

import Image from 'next/image'
import { useCartStore } from '@/stores/useCart'
import { toast } from 'react-toastify'
import {ProductCardItem } from '@/types/product'

interface AddCartBtnProps {
  product:ProductCardItem
  size?: string
  variantId?: string | null; // ID варианта товара для Saleor
}

export default function AddCartBtn({ product, size, variantId }: AddCartBtnProps) {
  const addItem = useCartStore((state) => state.addItem)

  const handleAddToCart = () => {
    addItem(
      product, 
      1, 
      size || product.size || '100 мл',
      variantId || product.variantId || undefined
    )
    toast.success('Товар добавлен в корзину!')
  }

  return (
    <button
      onClick={handleAddToCart}
      className="rounded-full bg-black w-[42px] h-[42px] flex items-center
                 justify-center relative cursor-pointer select-none
                 hover:scale-110
                 transition-transform duration-300 ease-out"
    >
      <Image src="/shopping-bag.svg" alt="cart icon" width={22} height={22} />
    </button>
  )
}

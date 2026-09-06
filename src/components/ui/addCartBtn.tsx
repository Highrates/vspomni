'use client'

import Image from 'next/image'
import { Minus, Plus, ShoppingBag } from 'lucide-react'
import { useCartStore } from '@/stores/useCart'
import { toast } from 'react-toastify'
import { ProductCardItem } from '@/types/product'
import {
  effectiveMaxQuantity,
  formatMaxQuantityMessage,
} from '@/lib/product/quantityLimit'

interface AddCartBtnProps {
  product: ProductCardItem
  size?: string
  variantId?: string | null
  /** Мобилка: полоса под ценой с текстом «В корзину» и компактный степпер */
  mobileRow?: boolean
}

export default function AddCartBtn({ product, size, variantId, mobileRow }: AddCartBtnProps) {
  const addItem = useCartStore((state) => state.addItem)
  const increaseQuantity = useCartStore((state) => state.increaseQuantity)
  const decreaseQuantity = useCartStore((state) => state.decreaseQuantity)

  const lineId = String(variantId || product.variantId || product.id)
  const quantity =
    useCartStore((s) => s.items.find((item) => item.id === lineId)?.quantity) ?? 0

  const resolvedSize = size || product.size || '100 мл'
  const resolvedVariantId = variantId || product.variantId || undefined
  const inStock = product.inStock !== false
  const maxQty = effectiveMaxQuantity(
    product.quantityLimitPerCustomer,
    product.quantityAvailable,
  )
  const atLimit = maxQty != null && quantity >= maxQty

  const handleAddFirst = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!inStock) {
      toast.error('Товара нет в наличии')
      return
    }
    const result = addItem(product, 1, resolvedSize, resolvedVariantId)
    if (!result.ok) {
      toast.error(result.message)
      return
    }
    toast.success('Товар добавлен в корзину!')
  }

  const handleDec = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    decreaseQuantity(lineId)
  }

  const handleInc = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (atLimit && maxQty != null) {
      toast.error(
        formatMaxQuantityMessage(
          maxQty,
          product.quantityLimitPerCustomer,
          product.quantityAvailable,
        ),
      )
      return
    }
    const result = increaseQuantity(lineId)
    if (!result.ok) {
      toast.error(result.message)
    }
  }

  const plusDisabled = atLimit

  if (quantity > 0) {
    if (mobileRow) {
      return (
        <div
          className="w-full max-w-[168px] mx-auto h-9 rounded-full bg-black flex items-center justify-between px-2 gap-0.5 cursor-default select-none"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            aria-label="Уменьшить количество"
            className="w-7 h-7 shrink-0 flex items-center justify-center rounded-full hover:bg-white/15 active:bg-white/20 transition-colors"
            onClick={handleDec}
          >
            <Minus className="w-[14px] h-[14px] text-white" strokeWidth={1.65} />
          </button>
          <span className="text-white text-[12px] font-semibold tabular-nums min-w-[1.1rem] text-center flex-1">
            {quantity}
          </span>
          <button
            type="button"
            aria-label={
              plusDisabled && maxQty != null
                ? formatMaxQuantityMessage(
                    maxQty,
                    product.quantityLimitPerCustomer,
                    product.quantityAvailable,
                  )
                : 'Увеличить количество'
            }
            disabled={plusDisabled}
            className="w-7 h-7 shrink-0 flex items-center justify-center rounded-full hover:bg-white/15 active:bg-white/20 transition-colors disabled:opacity-35 disabled:hover:bg-transparent disabled:cursor-not-allowed"
            onClick={handleInc}
          >
            <Plus className="w-[14px] h-[14px] text-white" strokeWidth={1.65} />
          </button>
        </div>
      )
    }

    return (
      <div
        className="rounded-full bg-black h-[42px] flex items-center justify-center gap-0.5 px-1.5 sm:gap-1 sm:px-2 min-w-[104px] sm:min-w-[118px] cursor-default select-none transition-all duration-300 ease-out"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          aria-label="Уменьшить количество"
          className="w-9 h-9 shrink-0 flex items-center justify-center rounded-full hover:bg-white/15 active:bg-white/20 transition-colors"
          onClick={handleDec}
        >
          <Minus className="w-[18px] h-[18px] text-white" strokeWidth={2.2} />
        </button>
        <span className="text-white text-sm font-semibold tabular-nums min-w-[1.5rem] text-center flex-1">
          {quantity}
        </span>
        <button
          type="button"
          aria-label={
            plusDisabled && maxQty != null
              ? formatMaxQuantityMessage(
                  maxQty,
                  product.quantityLimitPerCustomer,
                  product.quantityAvailable,
                )
              : 'Увеличить количество'
          }
          disabled={plusDisabled}
          className="w-9 h-9 shrink-0 flex items-center justify-center rounded-full hover:bg-white/15 active:bg-white/20 transition-colors disabled:opacity-35 disabled:hover:bg-transparent disabled:cursor-not-allowed"
          onClick={handleInc}
        >
          <Plus className="w-[18px] h-[18px] text-white" strokeWidth={2.2} />
        </button>
      </div>
    )
  }

  if (mobileRow) {
    return (
      <button
        type="button"
        onClick={handleAddFirst}
        disabled={!inStock}
        className="w-full h-9 pl-3.5 pr-4 rounded-full bg-black text-white text-[12px] font-medium flex items-center justify-center gap-1.5 cursor-pointer select-none active:scale-[0.98] transition-transform disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
      >
        <ShoppingBag className="w-4 h-4 text-white shrink-0" strokeWidth={1.8} aria-hidden />
        {inStock ? 'В корзину' : 'Нет в наличии'}
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={handleAddFirst}
      disabled={!inStock}
      title={inStock ? 'Добавить в корзину' : 'Нет в наличии'}
      aria-label={inStock ? 'Добавить в корзину' : 'Нет в наличии'}
      className="rounded-full bg-black w-[42px] h-[42px] flex items-center justify-center relative cursor-pointer select-none hover:scale-110 transition-transform duration-300 ease-out disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
    >
      <Image src="/shopping-bag.svg" alt="" width={22} height={22} />
    </button>
  )
}

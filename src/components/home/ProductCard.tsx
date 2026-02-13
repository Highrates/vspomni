'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ShoppingBag } from 'lucide-react'
import AddCartBtn from '@/components/ui/addCartBtn'
import { ProductCardItem } from '@/types/product'

interface ProductCardProps {
  product: ProductCardItem;
  isNew?: boolean;
}

export default function ProductCard({ product, isNew = false }: ProductCardProps) {
  const image =
    product.gallery && product.gallery.length > 0
      ? product.gallery[0]
      : product.image

  return (
    <Link
      href={'/product/' + product.slug}
      className="rounded-xl bg-white hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col group"
      draggable={false}
    >
      {/* Одна картинка, как на главной — без карусели */}
      <div className="w-full aspect-square sm:aspect-[369/384] relative overflow-hidden rounded-[12px] sm:rounded-[16px] bg-neutral-50">
        {image && (
          <Image
            src={image}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, (max-width: 1600px) 25vw, 369px"
            className="rounded-[12px] sm:rounded-[16px] object-cover transition-transform duration-300 group-hover:scale-105"
            draggable={false}
          />
        )}

        {/* Top-left badges: NEW and Discount */}
        <div className="absolute top-2 left-2 sm:top-3 sm:left-3 flex flex-col items-start gap-1 z-10 pointer-events-none">
          {isNew && (
            <div className="bg-[#E91E63] text-white text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-md select-none">
              NEW
            </div>
          )}
          {product.discountPercent && product.discountPercent > 0 && (
            <div className="bg-red-500 text-white text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-md select-none">
              -{product.discountPercent}%
            </div>
          )}
        </div>

        {/* Size Badge */}
        <div className="absolute bottom-2 left-2 sm:bottom-3 sm:left-3 bg-white/90 backdrop-blur-sm text-[10px] sm:text-[12px] font-medium text-black/70 px-1.5 sm:px-2 py-0.5 rounded-full border border-neutral-200 select-none z-10 pointer-events-none">
          {product.size}
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-col gap-1 sm:gap-2 pt-2 sm:pt-3 pb-2 sm:pb-4 px-0.5 sm:px-1">
        {/* Category/Aromas - inline with wrap (без запятых) */}
        {product.aromas && product.aromas.length > 0 && (
          <p className="text-[11px] sm:text-xs text-neutral-500">
            {product.aromas.join('  ')}
          </p>
        )}

        {/* Product Name */}
        <h3 className="font-semibold text-brand text-[13px] sm:text-base lg:text-lg select-none cursor-pointer line-clamp-2 leading-tight">
          {product.name}
        </h3>

        {/* Price Row */}
        <div className="flex items-center justify-between mt-1 sm:mt-2">
          <div className="flex items-center gap-1.5">
            {/* Mobile: Shopping bag icon with price */}
            <span className="sm:hidden flex items-center gap-1">
              <ShoppingBag size={14} className="text-neutral-600" />
            </span>
            <div className="flex flex-col items-start">
              {product.oldPrice && product.oldPrice > product.price && (
                <p className="text-[11px] text-neutral-400 line-through">
                  {product.oldPrice.toLocaleString('ru-RU')} ₽
                </p>
              )}
              <p className="text-brand text-sm sm:text-[15px] font-semibold select-none">
                {product.price.toLocaleString('ru-RU')} ₽
              </p>
            </div>
          </div>

          {/* Add to cart button - larger on desktop */}
          <div className="hidden sm:block shrink-0" onClick={(e) => e.preventDefault()}>
            <AddCartBtn product={product} size={product.size} variantId={product.variantId} />
          </div>
        </div>
      </div>
    </Link>
  )
}

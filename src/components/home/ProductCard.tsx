'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ShoppingBag } from 'lucide-react'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Pagination } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/pagination'
import AddCartBtn from '@/components/ui/addCartBtn'
import { ProductCardItem } from '@/types/product'
import { productDetailPath } from '@/lib/productPaths'

interface ProductCardProps {
  product: ProductCardItem
  isNew?: boolean
  /** Скрыть строку с ароматами (используем для категории «Подарочные пакеты») */
  hideAromas?: boolean
}

export default function ProductCard({ product, isNew = false, hideAromas = false }: ProductCardProps) {
  const detailHref = productDetailPath(product)
  const images =
    product.gallery && product.gallery.length > 0
      ? product.gallery
      : [product.image].filter(Boolean)

  const singleImage = images.length <= 1

  if (!detailHref) {
    return null
  }

  const cardBody = (
    <>
      <div className="w-full aspect-square sm:aspect-[369/384] relative overflow-hidden rounded-[12px] sm:rounded-[16px] bg-neutral-50">
        {singleImage ? (
          <>
            {images[0] && (
              <Image
                src={images[0]}
                alt={product.name}
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, (max-width: 1600px) 25vw, 369px"
                className="rounded-[12px] sm:rounded-[16px] object-cover transition-transform duration-500 group-hover:scale-105"
                draggable={false}
              />
            )}
          </>
        ) : (
          <Swiper
            modules={[Pagination]}
            pagination={{
              clickable: true,
              dynamicBullets: true,
            }}
            spaceBetween={0}
            slidesPerView={1}
            allowTouchMove={true}
            grabCursor={true}
            className="product-card-swiper w-full h-full rounded-[12px] sm:rounded-[16px]"
          >
            {images.map((src, index) => (
              <SwiperSlide key={index} className="relative h-full">
                <div className="relative w-full h-full">
                  <Image
                    src={src}
                    alt={index === 0 ? product.name : ''}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, (max-width: 1600px) 25vw, 369px"
                    className="rounded-[12px] sm:rounded-[16px] object-cover"
                    draggable={false}
                  />
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        )}

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

        <div className="absolute bottom-2 left-2 sm:bottom-3 sm:left-3 bg-white/90 backdrop-blur-sm text-[10px] sm:text-[12px] font-medium text-black/70 px-1.5 sm:px-2 py-0.5 rounded-full border border-neutral-200 select-none z-10 pointer-events-none">
          {product.size}
        </div>
      </div>

      <div className="flex flex-1 flex-col items-stretch gap-1 sm:gap-2 pt-2 sm:pt-3 pb-2 sm:pb-4 px-0.5 sm:px-1 min-w-0">
        <div className="flex min-w-0 flex-col gap-1 sm:gap-2">
          {!hideAromas && product.aromas && product.aromas.length > 0 && (
            <p className="text-[11px] sm:text-xs text-neutral-500">
              {product.aromas.join('  ')}
            </p>
          )}

          <h3 className="font-semibold text-brand text-[12px] sm:text-base lg:text-lg select-none cursor-pointer line-clamp-2 leading-[1.2] break-words [hyphens:auto]">
            {product.name}
          </h3>
        </div>

        <div className="mt-auto flex w-full items-center justify-between pt-1 sm:pt-2">
          <div className="flex items-center gap-1.5">
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

          <div className="hidden sm:block shrink-0" onClick={(e) => e.preventDefault()}>
            <AddCartBtn product={product} size={product.size} variantId={product.variantId} />
          </div>
        </div>

        {/* Мобилка: «В корзину» / степпер под ценой */}
        <div className="sm:hidden mt-2 w-full" onClick={(e) => e.preventDefault()}>
          <AddCartBtn
            product={product}
            size={product.size}
            variantId={product.variantId}
            mobileRow
          />
        </div>
      </div>
    </>
  )

  return (
    <Link
      href={detailHref}
      className="rounded-xl bg-white sm:hover:shadow-xl sm:hover:-translate-y-1 transition-all duration-300 flex h-full flex-col group"
      draggable={false}
    >
      {cardBody}
    </Link>
  )
}

import Image from 'next/image'
import Link from 'next/link'
import { ShoppingBag, ChevronLeft, ChevronRight } from 'lucide-react'
import { useState, useCallback } from 'react'
import AddCartBtn from '@/components/ui/addCartBtn'
import { ProductCardItem } from '@/types/product'

interface ProductCardProps {
    product:  ProductCardItem;
    isNew?: boolean;
}

export default function ProductCard({ product, isNew = false } :ProductCardProps) {
  const images = product.gallery && product.gallery.length > 0
    ? product.gallery
    : [product.image]

  const [currentIndex, setCurrentIndex] = useState(0)

  const goTo = useCallback(
    (index: number) => {
      if (!images.length) return
      const safeIndex = ((index % images.length) + images.length) % images.length
      setCurrentIndex(safeIndex)
    },
    [images.length],
  )

  const handlePrev = (e: React.MouseEvent) => {
    e.preventDefault()
    goTo(currentIndex - 1)
  }

  const handleNext = (e: React.MouseEvent) => {
    e.preventDefault()
    goTo(currentIndex + 1)
  }

  // Простая поддержка свайпов на мобильных
  const [touchStartX, setTouchStartX] = useState<number | null>(null)

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX)
  }

  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null) return
    const diff = e.changedTouches[0].clientX - touchStartX
    if (Math.abs(diff) > 30) {
      if (diff > 0) {
        goTo(currentIndex - 1)
      } else {
        goTo(currentIndex + 1)
      }
    }
    setTouchStartX(null)
  }

  return (
    <Link 
      href={'/product/' + product.slug}
      className="rounded-xl bg-white hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col group"
    >
      {/* Image Container */}
      <div
        className="w-full aspect-square sm:aspect-[369/384] relative overflow-hidden rounded-[12px] sm:rounded-[16px] transition-all duration-500 bg-neutral-50"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <Image
          key={images[currentIndex]}
          src={images[currentIndex]}
          alt={product.name}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, (max-width: 1600px) 25vw, 369px"
          className="rounded-[12px] sm:rounded-[16px] object-cover transition-transform duration-500 group-hover:scale-105"
        />

        {/* Навигация по слайдеру (показываем, только если больше одной картинки) */}
        {images.length > 1 && (
          <>
            <button
              className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/80 flex items-center justify-center shadow-sm hover:bg-white transition cursor-pointer"
              onClick={handlePrev}
              aria-label="Предыдущее фото"
            >
              <ChevronLeft className="w-4 h-4 text-black" />
            </button>
            <button
              className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/80 flex items-center justify-center shadow-sm hover:bg-white transition cursor-pointer"
              onClick={handleNext}
              aria-label="Следующее фото"
            >
              <ChevronRight className="w-4 h-4 text-black" />
            </button>
            {/* Пагинация-точки */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
              {images.map((_, idx) => (
                <button
                  key={idx}
                  aria-label={`Перейти к фото ${idx + 1}`}
                  onClick={(e) => {
                    e.preventDefault()
                    goTo(idx)
                  }}
                  className={`w-1.5 h-1.5 rounded-full transition ${
                    idx === currentIndex ? 'bg-white' : 'bg-white/40'
                  }`}
                />
              ))}
            </div>
          </>
        )}

        {/* Top-left badges: NEW above, then discount */}
        {(isNew || (product.discountPercent && product.discountPercent > 0)) && (
          <div className="absolute top-2 left-2 sm:top-3 sm:left-3 flex flex-col items-start gap-1">
            {isNew && (
              <div className="bg-[#E91E63] text-white text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-md select-none">
                NEW
              </div>
            )}
            {product.discountPercent && product.discountPercent > 0 && (
              <div className="bg-black text-white text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-full select-none">
                -{product.discountPercent}%
              </div>
            )}
          </div>
        )}

        {/* Size Badge */}
        <div className="absolute bottom-2 left-2 sm:bottom-3 sm:left-3 bg-white/90 backdrop-blur-sm text-[10px] sm:text-[12px] font-medium text-black/70 px-1.5 sm:px-2 py-0.5 rounded-full border border-neutral-200 select-none">
          {product.size}
        </div>
      </div>
      
      {/* Content */}
      <div className="flex flex-col gap-1 sm:gap-2 pt-2 sm:pt-3 pb-2 sm:pb-4 px-0.5 sm:px-1">
        {/* Category/Aromas - inline with wrap */}
        {product.aromas && product.aromas.length > 0 && (
          <p className="text-[11px] sm:text-xs text-neutral-500">
            {product.aromas.join(', ')}
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

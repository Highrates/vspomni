import Image from 'next/image'
import Link from 'next/link'
import { ShoppingBag } from 'lucide-react'
import { useState, useCallback, useRef } from 'react'
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
  const [isTransitioning, setIsTransitioning] = useState(false)
  const touchStartX = useRef<number | null>(null)
  const touchStartY = useRef<number | null>(null)
  const isDragging = useRef(false)

  const goTo = useCallback(
    (index: number) => {
      if (!images.length || isTransitioning) return
      const safeIndex = ((index % images.length) + images.length) % images.length
      setIsTransitioning(true)
      setCurrentIndex(safeIndex)
      setTimeout(() => setIsTransitioning(false), 300)
    },
    [images.length, isTransitioning],
  )

  // Улучшенная поддержка свайпов с плавной анимацией
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
    isDragging.current = false
  }

  const onTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return
    const diffX = e.touches[0].clientX - touchStartX.current
    const diffY = e.touches[0].clientY - touchStartY.current
    
    // Определяем, что это горизонтальный свайп, а не вертикальный скролл
    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 10) {
      isDragging.current = true
      e.preventDefault()
    }
  }

  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) {
      touchStartX.current = null
      touchStartY.current = null
      isDragging.current = false
      return
    }
    
    const diff = e.changedTouches[0].clientX - touchStartX.current
    const threshold = 50 // Минимальное расстояние для срабатывания свайпа
    
    // Если был свайп (перетаскивание)
    if (isDragging.current && Math.abs(diff) > threshold) {
      e.preventDefault()
      e.stopPropagation()
      if (diff > 0) {
        goTo(currentIndex - 1)
      } else {
        goTo(currentIndex + 1)
      }
    } 
    // Если был простой тап (без перетаскивания) и больше одной картинки
    else if (!isDragging.current && images.length > 1) {
      e.preventDefault()
      e.stopPropagation()
      const touchEndX = e.changedTouches[0].clientX
      const target = e.currentTarget as HTMLElement
      const rect = target.getBoundingClientRect()
      const clickX = touchEndX - rect.left
      const width = rect.width
      
      // Левая половина - предыдущее, правая - следующее
      if (clickX < width / 2) {
        goTo(currentIndex - 1)
      } else {
        goTo(currentIndex + 1)
      }
    }
    
    touchStartX.current = null
    touchStartY.current = null
    isDragging.current = false
  }

  // Обработчик клика для десктопа (аналогично тапу)
  const handleImageClick = (e: React.MouseEvent) => {
    if (images.length <= 1 || isTransitioning) return
    
    e.preventDefault()
    e.stopPropagation()
    
    const target = e.currentTarget as HTMLElement
    const rect = target.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const width = rect.width
    
    // Левая половина - предыдущее, правая - следующее
    if (clickX < width / 2) {
      goTo(currentIndex - 1)
    } else {
      goTo(currentIndex + 1)
    }
  }

  return (
    <Link 
      href={'/product/' + product.slug}
      className="rounded-xl bg-white hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col group"
    >
      {/* Image Container */}
      <div
        className="w-full aspect-square sm:aspect-[369/384] relative overflow-hidden rounded-[12px] sm:rounded-[16px] bg-neutral-50 cursor-pointer"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onClick={handleImageClick}
      >
        {/* Slider Container with smooth transition */}
        <div 
          className="w-full h-full flex transition-transform duration-300 ease-out"
          style={{
            transform: `translateX(-${currentIndex * 100}%)`,
          }}
        >
          {images.map((image, idx) => (
            <div
              key={idx}
              className="w-full h-full flex-shrink-0 relative"
            >
              <Image
                src={image}
                alt={`${product.name} - изображение ${idx + 1}`}
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, (max-width: 1600px) 25vw, 369px"
                className="rounded-[12px] sm:rounded-[16px] object-cover transition-transform duration-300 group-hover:scale-105"
                priority={idx === 0}
              />
            </div>
          ))}
        </div>

        {/* Пагинация-точки (показываем, только если больше одной картинки) */}
        {images.length > 1 && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
            {images.map((_, idx) => (
              <button
                key={idx}
                aria-label={`Перейти к фото ${idx + 1}`}
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  goTo(idx)
                }}
                className={`w-1.5 h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                  idx === currentIndex ? 'bg-white w-4' : 'bg-white/40 hover:bg-white/60'
                }`}
              />
            ))}
          </div>
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

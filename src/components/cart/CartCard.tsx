import { formatCurrency } from "@/lib/functions";
import { ProductCardItem } from "@/types/product";
import Image from "next/image";
import { useCartStore } from "@/stores/useCart";
import { toast } from "react-toastify";
import {
  formatQuantityLimitMessage,
  normalizeQuantityLimit,
} from "@/lib/product/quantityLimit";

interface CartCardProps {
  product: ProductCardItem;
  quantity: number;
  size?: string;
  onIncrease?: () => void;
  onDecrease?: () => void;
  onRemove?: () => void;
  outStock?: boolean;
}

export default function CartCard({
  product,
  quantity,
  size,
  onIncrease,
  onDecrease,
  onRemove,
  outStock,
}: CartCardProps) {
  const discountPercent = useCartStore((state) => state.discount)
  const increaseQuantity = useCartStore((state) => state.increaseQuantity)
  const sizeStr = size ?? ''
  const sizeHasMl = sizeStr.toLowerCase().includes('мл')
  const displaySize = sizeStr === 'sampler' ? 'Пробник' : (sizeHasMl ? sizeStr : sizeStr ? `${sizeStr} мл` : '')
  const showTrashInsteadOfMinus = quantity <= 1

  const price = Number(product?.price) || 0
  const oldPrice = Number(product?.oldPrice) ?? 0
  const hasProductDiscount = oldPrice > 0 && oldPrice > price
  const baseProductPrice = hasProductDiscount ? oldPrice : price
  const productPriceWithDiscount = hasProductDiscount ? price : price
  const basePrice = baseProductPrice * quantity
  const priceWithProductDiscount = productPriceWithDiscount * quantity
  const hasPromoDiscount = discountPercent > 0
  const finalPrice = hasPromoDiscount
    ? Math.round(priceWithProductDiscount * (1 - discountPercent / 100))
    : priceWithProductDiscount
  const showOldPrice = hasProductDiscount || hasPromoDiscount

  const maxQty = normalizeQuantityLimit(product?.quantityLimitPerCustomer)
  const atLimit = maxQty != null && quantity >= maxQty
  const lineId = String(product?.variantId || product?.id || '')

  const handleIncrease = () => {
    if (atLimit && maxQty != null) {
      toast.error(formatQuantityLimitMessage(maxQty))
      return
    }
    if (lineId) {
      const result = increaseQuantity(lineId)
      if (!result.ok) {
        toast.error(result.message)
      }
      return
    }
    onIncrease?.()
  }

  const ActionButton = ({
    children,
    onClick,
    disabled,
    title,
  }: {
    children: React.ReactNode
    onClick?: () => void
    disabled?: boolean
    title?: string
  }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="w-8 h-8 sm:w-9 sm:h-9 border border-black/15 rounded-xl flex items-center justify-center cursor-pointer hover:bg-black/5 active:scale-95 transition-all duration-200 disabled:opacity-35 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:active:scale-100"
      aria-label={typeof children === 'string' ? children : title}
    >
      {children}
    </button>
  )

  return (
    <div className="bg-white border border-black/8 rounded-2xl sm:rounded-3xl p-3 sm:p-4 shadow-sm w-full">
      <div className="flex gap-3 sm:gap-4">
        {/* Фото */}
        <div className="relative w-20 h-20 sm:w-24 sm:h-24 shrink-0 rounded-xl sm:rounded-2xl overflow-hidden bg-neutral-100">
          <Image
            src={product?.thumbnail || ''}
            alt={product?.name || 'Товар'}
            fill
            className="object-cover"
            sizes="96px"
          />
        </div>

        {/* Название, объём, счётчик */}
        <div className="flex-1 min-w-0 flex flex-col justify-between">
          <div>
            <h2 className={`font-semibold text-sm sm:text-base leading-tight line-clamp-2 ${outStock ? 'text-black/40' : 'text-black'}`}>
              {product?.name || 'Товар'}
            </h2>
            {displaySize ? (
              <p className={`text-xs mt-0.5 ${outStock ? 'text-black/30' : 'text-black/55'}`}>
                {displaySize}
              </p>
            ) : null}
          </div>

          {outStock ? (
            <div className="flex items-center gap-2 mt-2">
              <ActionButton onClick={onRemove}>
                <Image src="/trash.svg" alt="Удалить" width={14} height={14} />
              </ActionButton>
              <span className="text-xs font-medium text-black/50">Товар закончился</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 mt-2">
              <ActionButton onClick={showTrashInsteadOfMinus ? onRemove : onDecrease}>
                {showTrashInsteadOfMinus ? (
                  <Image src="/trash.svg" alt="Удалить" width={14} height={14} />
                ) : (
                  <span className="text-base font-medium select-none">−</span>
                )}
              </ActionButton>
              <span className="text-sm font-semibold min-w-[1.25rem] text-center">{quantity}</span>
              <ActionButton
                onClick={handleIncrease}
                disabled={atLimit}
                title={
                  atLimit && maxQty != null
                    ? formatQuantityLimitMessage(maxQty)
                    : 'Увеличить количество'
                }
              >
                <span className="text-base font-medium select-none">+</span>
              </ActionButton>
            </div>
          )}
        </div>

        {/* Цена справа */}
        {!outStock && (
          <div className="flex flex-col items-end justify-between shrink-0">
            <div className="text-right">
              {showOldPrice && (
                <p className="text-xs text-black/45 line-through leading-tight">
                  {formatCurrency(hasProductDiscount ? basePrice : priceWithProductDiscount)} ₽
                </p>
              )}
              <p className="font-semibold text-sm sm:text-base whitespace-nowrap text-black">
                {formatCurrency(finalPrice)} ₽
              </p>
              {hasProductDiscount && (product?.discountPercent ?? 0) > 0 && (
                <span className="text-xs text-red-500 font-medium">−{product?.discountPercent}%</span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

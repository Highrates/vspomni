import { formatCurrency } from "@/lib/functions";
import { ProductCardItem } from "@/types/product";
import Image from "next/image";
import { useCartStore } from "@/stores/useCart";

interface CartCardProps {
  product: ProductCardItem;
  quantity: number;
  size: string;
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
  // Remove duplicate "мл" if size already contains it
  const sizeHasMl = size.toLowerCase().includes('мл');
  const displaySize = size === "sampler" ? "Пробник" : (sizeHasMl ? size : `${size} мл`);
  const showTrashInsteadOfMinus = quantity <= 1;

  const ActionButton = ({
    children,
    onClick,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
  }) => (
    <button
      onClick={onClick}
      className="w-6 h-6 border border-black/15 rounded flex items-center justify-center cursor-pointer hover:border-black duration-300"
    >
      {children}
    </button>
  );

  // Базовая цена товара (уже может быть со скидкой, если oldPrice есть)
  const baseProductPrice = product.oldPrice && product.oldPrice > product.price 
    ? product.oldPrice 
    : product.price;
  
  // Цена товара со скидкой (если есть oldPrice)
  const productPriceWithDiscount = product.oldPrice && product.oldPrice > product.price
    ? product.price
    : product.price;
  
  // Итоговая цена за количество с учетом скидки товара
  const basePrice = baseProductPrice * quantity;
  const priceWithProductDiscount = productPriceWithDiscount * quantity;
  
  // Применяем промокод к цене со скидкой товара
  const hasPromoDiscount = discountPercent > 0;
  const finalPrice = hasPromoDiscount
    ? Math.round(priceWithProductDiscount * (1 - discountPercent / 100))
    : priceWithProductDiscount;
  
  // Показываем старую цену, если есть скидка товара или промокод
  const hasProductDiscount = product.oldPrice && product.oldPrice > product.price;
  const showOldPrice = hasProductDiscount || hasPromoDiscount;

  return (
    <div className="border rounded-4xl p-2 shadow-sm w-full">
      <div className="flex justify-between items-end">
        <div className="flex gap-4">
          <Image
            src={product.thumbnail}
            alt={product.name || 'product image'}
            width={80}
            height={80}
            className="object-cover w-20 h-20 rounded-3xl"
          />

          <div className="flex flex-col justify-between py-1">
            <div>
              <h2 className={`font-semibold ${outStock ? "text-black/30" : ""}`}>
                {product.name}
              </h2>
              <p className={`text-xs -mt-1 ${outStock ? "text-black/30" : "text-black/60"}`}>
                {displaySize}
              </p>
            </div>

            {outStock ? (
              <div className="flex items-center space-x-3">
                <ActionButton onClick={onRemove}>
                  <Image src="/trash.svg" alt="remove" width={12} height={12} />
                </ActionButton>
                <h2 className="font-semibold text-xs">Этот товар закончился</h2>
              </div>
            ) : (
              <div className="flex items-center gap-2 mt-1">
                <ActionButton onClick={showTrashInsteadOfMinus ? onRemove : onDecrease}>
                  {showTrashInsteadOfMinus ? (
                    <Image src="/trash.svg" alt="remove" width={12} height={12} />
                  ) : (
                    <span className="text-sm">-</span>
                  )}
                </ActionButton>

                <span className="text-sm font-medium">{quantity}</span>

                <ActionButton onClick={onIncrease}>
                  <Image src="/plus.svg" alt="plus" width={12} height={12} />
                </ActionButton>
              </div>
            )}
          </div>
        </div>

        {!outStock && (
          <div className="flex flex-col items-end mr-2">
            {showOldPrice && (
              <span className="text-xs text-black/40 line-through">
                {formatCurrency(hasProductDiscount ? basePrice : priceWithProductDiscount)} ₽
              </span>
            )}
            <span className="font-semibold text-sm whitespace-nowrap">
              {formatCurrency(finalPrice)} ₽
            </span>
            {/* Показываем бейдж скидки товара, если есть */}
            {hasProductDiscount && product.discountPercent && product.discountPercent > 0 && (
              <span className="text-xs text-red-500 font-medium">
                -{product.discountPercent}%
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

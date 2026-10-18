'use client';

import { Minus, Plus } from "lucide-react";
import { useCartStore } from "@/stores/useCart";
import { useCartUiStore } from "@/stores/useCartUiStore";
import { ProductCardItem } from "@/types/product";
import { toast } from "react-toastify";
import {
  effectiveMaxQuantity,
  formatMaxQuantityMessage,
} from "@/lib/product/quantityLimit";

interface AddCartButtonProps {
  product: ProductCardItem | null;
  size: string | null;
  variantId?: string | null;
  /** false → кнопка «Нет в наличии» (единый источник с SEO) */
  inStock?: boolean;
}

export default function AddCartButton({
  product,
  size,
  variantId,
  inStock = true,
}: AddCartButtonProps) {
  const addItem = useCartStore((state) => state.addItem);
  const increaseQuantity = useCartStore((state) => state.increaseQuantity);
  const decreaseQuantity = useCartStore((state) => state.decreaseQuantity);
  const openCartModal = useCartUiStore((state) => state.openCartModal);

  const lineId = product
    ? String(variantId || product.variantId || product.id)
    : "";
  const quantity =
    useCartStore((s) =>
      lineId ? (s.items.find((item) => item.id === lineId)?.quantity ?? 0) : 0,
    );

  const canAdd = Boolean(product && size && inStock);
  const maxQty = effectiveMaxQuantity(
    product?.quantityLimitPerCustomer,
    product?.quantityAvailable,
  )
  const atLimit = maxQty != null && quantity >= maxQty

  const handleAddFirst = () => {
    if (!inStock) {
      toast.error("Товара нет в наличии");
      return;
    }
    if (!product || !size) {
      toast.error("Пожалуйста, выберите размер перед добавлением в корзину.");
      return;
    }
    const result = addItem(product, 1, size, variantId || product.variantId || undefined);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    toast.success("Товар добавлен в корзину!");
  };

  const handleDec = () => {
    if (lineId) decreaseQuantity(lineId);
  };

  const handleInc = () => {
    if (!inStock) return;
    if (atLimit && maxQty != null && product) {
      toast.error(
        formatMaxQuantityMessage(
          maxQty,
          product.quantityLimitPerCustomer,
          product.quantityAvailable,
        ),
      );
      return;
    }
    if (!lineId) return;
    const result = increaseQuantity(lineId);
    if (!result.ok) {
      toast.error(result.message);
    }
  };

  if (!inStock) {
    return (
      <button
        type="button"
        disabled
        className="w-full bg-black/20 text-black/50 rounded-full py-3 text-base font-medium cursor-not-allowed select-none"
      >
        Нет в наличии
      </button>
    );
  }

  if (canAdd && quantity > 0) {
    return (
      <div className="w-full flex flex-row flex-wrap sm:flex-nowrap items-stretch gap-2">
        <div className="min-w-0 flex-1 h-12 rounded-full bg-black flex items-center justify-between px-2 gap-1 select-none">
          <button
            type="button"
            aria-label="Уменьшить количество"
            className="w-10 h-10 shrink-0 flex items-center justify-center rounded-full hover:bg-white/15 active:bg-white/20 transition-colors"
            onClick={handleDec}
          >
            <Minus className="w-5 h-5 text-white" strokeWidth={2.2} />
          </button>
          <span className="text-white text-base font-semibold tabular-nums min-w-[1.5rem] text-center flex-1">
            {quantity}
          </span>
          <button
            type="button"
            aria-label={
              atLimit && maxQty != null && product
                ? formatMaxQuantityMessage(
                    maxQty,
                    product.quantityLimitPerCustomer,
                    product.quantityAvailable,
                  )
                : "Увеличить количество"
            }
            disabled={atLimit}
            className="w-10 h-10 shrink-0 flex items-center justify-center rounded-full hover:bg-white/15 active:bg-white/20 transition-colors disabled:opacity-35 disabled:hover:bg-transparent disabled:cursor-not-allowed"
            onClick={handleInc}
          >
            <Plus className="w-5 h-5 text-white" strokeWidth={2.2} />
          </button>
        </div>
        <button
          type="button"
          onClick={openCartModal}
          className="shrink-0 h-12 rounded-full border border-black bg-white px-4 sm:px-5 text-sm font-semibold text-black hover:bg-black/5 transition-colors cursor-pointer select-none whitespace-nowrap"
          aria-label="Открыть корзину"
        >
          В корзине →
        </button>
      </div>
    );
  }

  return (
    <button
      disabled={!product}
      type="button"
      onClick={handleAddFirst}
      className="w-full bg-black text-white rounded-full py-3 text-base font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer select-none"
    >
      Добавить в корзину
    </button>
  );
}

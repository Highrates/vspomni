"use client";

import { Minus, Plus } from "lucide-react";
import { useCartStore } from "@/stores/useCart";
import { ProductCardItem } from "@/types/product";
import { toast } from "react-toastify";

interface AddCartButtonProps {
  product: ProductCardItem | null;
  size: string | null;
  variantId?: string | null;
}

export default function AddCartButton({ product, size, variantId }: AddCartButtonProps) {
  const addItem = useCartStore((state) => state.addItem);
  const increaseQuantity = useCartStore((state) => state.increaseQuantity);
  const decreaseQuantity = useCartStore((state) => state.decreaseQuantity);

  const lineId = product
    ? String(variantId || product.variantId || product.id)
    : "";
  const quantity =
    useCartStore((s) =>
      lineId ? (s.items.find((item) => item.id === lineId)?.quantity ?? 0) : 0,
    );

  const canAdd = Boolean(product && size);

  const handleAddFirst = () => {
    if (!product || !size) {
      toast.error("Пожалуйста, выберите размер перед добавлением в корзину.");
      return;
    }
    addItem(product, 1, size, variantId || product.variantId || undefined);
    toast.success("Товар добавлен в корзину!");
  };

  const handleDec = () => {
    if (lineId) decreaseQuantity(lineId);
  };

  const handleInc = () => {
    if (lineId) increaseQuantity(lineId);
  };

  if (canAdd && quantity > 0) {
    return (
      <div className="w-full h-12 rounded-full bg-black flex items-center justify-between px-2 gap-1 select-none">
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
          aria-label="Увеличить количество"
          className="w-10 h-10 shrink-0 flex items-center justify-center rounded-full hover:bg-white/15 active:bg-white/20 transition-colors"
          onClick={handleInc}
        >
          <Plus className="w-5 h-5 text-white" strokeWidth={2.2} />
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

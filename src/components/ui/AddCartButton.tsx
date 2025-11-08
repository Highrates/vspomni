"use client";

import { productsGridItem } from "@/lib/mock/products";
import { useCartStore } from "@/stores/useCart";
import { toast } from "react-toastify";

interface AddCartButtonProps {
    product: productsGridItem;
    size: string | null;
}

export default function AddCartButton({ product, size }: AddCartButtonProps) {
    const addItem = useCartStore((state) => state.addItem);
    const removeItem = useCartStore((state) => state.removeItem);
    const items = useCartStore((state) => state.items)
    const handleAddToCart = () => {
        if (!size || !product) {
            toast.error("Пожалуйста, выберите размер перед добавлением в корзину.");
            return;
        }
        addItem(product, 1, size!)
        toast.success("Товар добавлен в корзину!");
    }
    return (
        <button
            type="submit"
            onClick={handleAddToCart}
            className="w-full bg-black text-white rounded-full py-3 text-base font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer select-none"
        >
            Добавить в корзину
        </button>
    );
}

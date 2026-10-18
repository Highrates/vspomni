import { productsGridItem } from "@/lib/mock/products"
import { ProductCardItem } from "@/types/product"

export interface CartItem {
    id: string
    product: ProductCardItem
    quantity: number
    size: string
    variantId?: string // ID варианта товара для Saleor checkout
}

export interface Cart {
    items: CartItem[]
    totalItems: number
    totalPrice: number
}

export interface AddItemPayload {
    itemId: string;
    quantity: number
    size: string
}
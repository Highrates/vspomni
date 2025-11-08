import { productsGridItem } from "@/lib/mock/products"

export interface CartItem {
    id: string
    product: productsGridItem
    quantity: number
    size: string
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
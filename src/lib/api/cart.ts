import { AddItemPayload } from "@/types/cart";
import api from "../axios";
import { Cart } from "@/types/cart";

export const cartApi = {
    getCart: (): Promise<Cart> => api.get("/cart"),

    addItem: ({ itemId, quantity, size }: AddItemPayload): Promise<Cart> =>
        api.post("/cart/items", { itemId, quantity, size }),

    removeItem: (itemId: string): Promise<Cart> =>
        api.delete(`/cart/items/${itemId}`),

    clearCart: (): Promise<Cart> => api.delete("/cart/clear"),
}

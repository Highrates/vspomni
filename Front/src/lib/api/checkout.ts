export const checkoutApi = {
    initiateCheckout: (cartId: string) => Promise.resolve({ checkoutId: "chk_12345" }),
    getCheckoutStatus: (checkoutId: string) => Promise.resolve({ status: "pending" }),
}
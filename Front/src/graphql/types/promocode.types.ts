export interface MutationError {
  code: string
  field?: string
  message: string
}

export interface Money {
  amount: number
  currency: string
}

export interface PriceInfo {
  gross: Money
}

export interface CheckoutLine {
  id: string
  isGift: boolean
  quantity: number
  totalPrice: PriceInfo
  undiscountedTotalPrice: Money
  variant: {
    name: string
  }
}

export interface Checkout {
  id: string
  totalPrice: PriceInfo
  voucherCode: string | null
  quantity: number
  lines: CheckoutLine[]
  isShippingRequired: boolean
}

export interface PromoCodeAddPayload {
  checkout: Checkout | null
  errors: MutationError[]
}

export interface PromoCodeRemovePayload {
  checkout: Checkout | null
  errors: MutationError[]
}

export interface PromoCodeAddResponse {
  checkoutAddPromoCode: PromoCodeAddPayload
}

export interface PromoCodeRemoveResponse {
  checkoutRemovePromoCode: PromoCodeRemovePayload
}

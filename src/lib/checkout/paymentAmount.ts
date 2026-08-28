export type ShippingCarrier = 'cdek' | 'yandex' | 'ozon'

/**
 * Сумма к оплате, если totalPrice из Saleor ещё без доставки (промокод применён на бэкенде).
 */
export function computeCheckoutPaymentAmount(
  saleorSubtotal: number | null | undefined,
  shippingPrice: number,
  cartTotalPrice: number,
): number {
  if (saleorSubtotal != null && Number.isFinite(saleorSubtotal)) {
    return saleorSubtotal + (Number(shippingPrice) || 0)
  }
  return cartTotalPrice
}

export function getSaleorRestBaseUrl(): string {
  const graphqlUrl =
    process.env.GRAPHQL_PUBLIC_API_URL ||
    `${process.env.NEXT_PUBLIC_SALEOR_API_URL || 'https://vspomni.store'}/graphql/`
  return graphqlUrl.replace(/\/graphql\/?$/, '').replace(/\/$/, '') || 'https://vspomni.store'
}

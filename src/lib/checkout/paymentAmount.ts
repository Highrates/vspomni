export type ShippingCarrier = 'cdek' | 'yandex' | 'ozon'

export function getSaleorRestBaseUrl(): string {
  const graphqlUrl =
    process.env.GRAPHQL_PUBLIC_API_URL ||
    `${process.env.NEXT_PUBLIC_SALEOR_API_URL || 'https://vspomni.store'}/graphql/`
  return graphqlUrl.replace(/\/graphql\/?$/, '').replace(/\/$/, '') || 'https://vspomni.store'
}

/** Серверная версия: итог checkout в Saleor (null, если checkout не найден или API недоступен). */
export async function fetchSaleorCheckoutTotal(checkoutToken: string): Promise<number | null> {
  const id = checkoutToken.startsWith('Q2hlY2tvdXQ6')
    ? checkoutToken
    : Buffer.from(`Checkout:${checkoutToken}`).toString('base64')
  try {
    const response = await fetch(`${getSaleorRestBaseUrl()}/graphql/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: 'query CheckoutTotal($id: ID!) { checkout(id: $id) { totalPrice { gross { amount } } } }',
        variables: { id },
      }),
      cache: 'no-store',
    })
    if (!response.ok) return null
    const result = await response.json()
    const amount = result?.data?.checkout?.totalPrice?.gross?.amount
    return typeof amount === 'number' && Number.isFinite(amount) ? amount : null
  } catch {
    return null
  }
}

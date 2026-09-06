import { getSaleorRestBaseUrl } from '@/lib/checkout/paymentAmount'

export type StockCheckItem = {
  variantId?: string
  productName?: string
  requested?: number
  available?: number
}

export type StockCheckResult =
  | { available: true }
  | {
      available: false
      message: string
      items?: StockCheckItem[]
    }

export async function checkCheckoutStockViaRest(
  checkoutId: string,
): Promise<StockCheckResult> {
  const baseUrl = getSaleorRestBaseUrl()
  const response = await fetch(`${baseUrl}/api/checkout/check-stock/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ checkoutId }),
    cache: 'no-store',
  })

  const result = await response.json().catch(() => ({}))

  if (response.ok) {
    return { available: true }
  }

  if (response.status === 409) {
    return {
      available: false,
      message:
        result.message ||
        result.error ||
        'Недостаточно товара на складе. Обновите корзину.',
      items: Array.isArray(result.items) ? result.items : undefined,
    }
  }

  throw new Error(
    result.error ||
      `Failed to verify stock availability (HTTP ${response.status})`,
  )
}

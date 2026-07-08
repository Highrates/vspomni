const YOOKASSA_API_URL = 'https://api.yookassa.ru/v3'
const YOOKASSA_SHOP_ID = process.env.YOOKASSA_SHOP_ID
const YOOKASSA_SECRET_KEY = process.env.YOOKASSA_SECRET_KEY

function getAuthHeader(): string {
  if (!YOOKASSA_SHOP_ID || !YOOKASSA_SECRET_KEY) {
    throw new Error('YooKassa credentials not configured')
  }
  return `Basic ${Buffer.from(`${YOOKASSA_SHOP_ID}:${YOOKASSA_SECRET_KEY}`).toString('base64')}`
}

export async function yookassaGetPayment(paymentId: string) {
  const response = await fetch(`${YOOKASSA_API_URL}/payments/${paymentId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: getAuthHeader(),
    },
    cache: 'no-store',
  })

  const result = await response.json()

  if (!response.ok) {
    throw new Error(result?.description || 'Failed to fetch payment status')
  }

  return result as {
    id: string
    status: string
    paid: boolean
    amount?: { value: string; currency: string }
  }
}

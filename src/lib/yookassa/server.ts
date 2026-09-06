const YOOKASSA_API_URL = 'https://api.yookassa.ru/v3'
const YOOKASSA_SHOP_ID = process.env.YOOKASSA_SHOP_ID
const YOOKASSA_SECRET_KEY = process.env.YOOKASSA_SECRET_KEY

/** https://yookassa.ru/developers/using-api/webhooks#ip */
const YOOKASSA_WEBHOOK_CIDRS = [
  '185.71.76.0/27',
  '185.71.77.0/27',
  '77.75.153.0/25',
  '77.75.154.128/25',
  '77.75.156.11/32',
  '77.75.156.35/32',
  '77.75.157.0/24',
]

export type YookassaPayment = {
  id: string
  status: string
  paid: boolean
  amount?: { value: string; currency: string }
  metadata?: Record<string, string>
}

function getAuthHeader(): string {
  if (!YOOKASSA_SHOP_ID || !YOOKASSA_SECRET_KEY) {
    throw new Error('YooKassa credentials not configured')
  }
  return `Basic ${Buffer.from(`${YOOKASSA_SHOP_ID}:${YOOKASSA_SECRET_KEY}`).toString('base64')}`
}

export async function yookassaGetPayment(paymentId: string): Promise<YookassaPayment> {
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

  return result as YookassaPayment
}

export type YookassaRefund = {
  id: string
  status: string
  payment_id?: string
}

export async function yookassaCreateRefund(params: {
  paymentId: string
  amount: number
  currency?: string
}): Promise<YookassaRefund> {
  const currency = params.currency || 'RUB'
  const response = await fetch(`${YOOKASSA_API_URL}/refunds`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: getAuthHeader(),
      'Idempotence-Key': `${params.paymentId}-${params.amount.toFixed(2)}`,
    },
    body: JSON.stringify({
      payment_id: params.paymentId,
      amount: {
        value: params.amount.toFixed(2),
        currency,
      },
    }),
    cache: 'no-store',
  })

  const result = await response.json()

  if (!response.ok) {
    throw new Error(result?.description || 'Failed to create refund')
  }

  return result as YookassaRefund
}

function ipv4ToInt(ip: string): number | null {
  const parts = ip.trim().split('.')
  if (parts.length !== 4) return null
  let value = 0
  for (const part of parts) {
    const n = Number(part)
    if (!Number.isInteger(n) || n < 0 || n > 255) return null
    value = (value << 8) + n
  }
  return value >>> 0
}

function ipMatchesCidr(ip: string, cidr: string): boolean {
  const [network, prefixRaw] = cidr.split('/')
  const prefix = Number(prefixRaw)
  const ipInt = ipv4ToInt(ip)
  const networkInt = ipv4ToInt(network)
  if (ipInt == null || networkInt == null || !Number.isInteger(prefix) || prefix < 0 || prefix > 32) {
    return false
  }
  const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0
  return (ipInt & mask) === (networkInt & mask)
}

function getExtraWebhookIps(): string[] {
  const raw = process.env.YOOKASSA_WEBHOOK_IPS?.trim()
  if (!raw) return []
  return raw.split(',').map((s) => s.trim()).filter(Boolean)
}

export function isYookassaWebhookIp(ip: string | null | undefined): boolean {
  if (!ip) return false
  const normalized = ip.trim()
  if (!normalized) return false

  const allowlist = [...YOOKASSA_WEBHOOK_CIDRS, ...getExtraWebhookIps()]
  return allowlist.some((entry) => {
    if (entry.includes('/')) return ipMatchesCidr(normalized, entry)
    return normalized === entry
  })
}

export function getRequestClientIp(request: Request): string | null {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim()
    if (first) return first
  }
  return request.headers.get('x-real-ip')?.trim() || null
}

export function assertYookassaWebhookIp(request: Request): void {
  if (process.env.YOOKASSA_SKIP_IP_CHECK === 'true') return

  const clientIp = getRequestClientIp(request)
  if (!isYookassaWebhookIp(clientIp)) {
    throw new Error(`Webhook rejected: untrusted source IP (${clientIp || 'unknown'})`)
  }
}

export async function verifyYookassaSucceededPayment(
  paymentId: string,
  options?: {
    expectedCheckoutId?: string
    expectedAmount?: number
  },
): Promise<{
  payment: YookassaPayment
  checkoutId: string
  metadata: Record<string, string>
  paymentAmount: number
  shippingAmount?: number
  shippingCarrier?: 'cdek' | 'yandex' | 'ozon'
  userEmail?: string
  allowFreeShipping?: boolean
}> {
  const payment = await yookassaGetPayment(paymentId)
  const paid = payment.paid || payment.status === 'succeeded'

  if (!paid) {
    throw new Error(`Payment not succeeded (status: ${payment.status})`)
  }

  const metadata = payment.metadata || {}
  const checkoutId = metadata.orderId || metadata.checkoutId

  if (!checkoutId) {
    throw new Error('No checkoutId in payment metadata')
  }

  if (options?.expectedCheckoutId && checkoutId !== options.expectedCheckoutId) {
    throw new Error('Checkout ID mismatch between webhook and YooKassa API')
  }

  const paymentAmount = payment.amount?.value
    ? parseFloat(payment.amount.value)
    : NaN

  if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
    throw new Error('Invalid payment amount from YooKassa API')
  }

  if (
    options?.expectedAmount != null &&
    Math.abs(paymentAmount - options.expectedAmount) > 0.01
  ) {
    throw new Error('Payment amount mismatch between webhook and YooKassa API')
  }

  const shippingAmountRaw = metadata.shippingAmount
  const shippingAmount = shippingAmountRaw
    ? parseFloat(String(shippingAmountRaw))
    : undefined
  const shippingCarrier = metadata.shippingCarrier as
    | 'cdek'
    | 'yandex'
    | 'ozon'
    | undefined
  const allowFreeShipping =
    metadata.allowFreeShipping === 'true' || metadata.allowFreeShipping === true

  if (
    shippingCarrier &&
    (!shippingAmount || shippingAmount <= 0) &&
    !allowFreeShipping
  ) {
    throw new Error('Payment metadata missing valid shipping amount')
  }

  const userEmail = metadata.userEmail || metadata.userId

  return {
    payment,
    checkoutId,
    metadata,
    paymentAmount,
    shippingAmount,
    shippingCarrier,
    userEmail,
    allowFreeShipping,
  }
}

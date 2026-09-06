import { NextRequest, NextResponse } from 'next/server'
import { getCheckoutSuccessUrl } from '@/lib/siteUrl'
import { checkCheckoutStockViaRest } from '@/lib/checkout/stockCheck'

// ============================================
// YooKassa API Route Handler
// ============================================

const YOOKASSA_API_URL = 'https://api.yookassa.ru/v3'
const YOOKASSA_SHOP_ID = process.env.YOOKASSA_SHOP_ID
const YOOKASSA_SECRET_KEY = process.env.YOOKASSA_SECRET_KEY

if (!YOOKASSA_SHOP_ID || !YOOKASSA_SECRET_KEY) {
  console.error('YOOKASSA_SHOP_ID and YOOKASSA_SECRET_KEY must be set in environment variables')
}

/**
 * Создать ответ с CORS заголовками
 */
function createResponse(data: unknown, status = 200): NextResponse {
  return NextResponse.json(data, {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}

/**
 * Выполнить запрос к YooKassa API
 */
async function yookassaRequest(
  endpoint: string,
  options: {
    method?: 'GET' | 'POST' | 'PATCH'
    body?: object
  } = {}
): Promise<Response> {
  if (!YOOKASSA_SHOP_ID || !YOOKASSA_SECRET_KEY) {
    throw new Error('YooKassa credentials not configured')
  }

  const { method = 'POST', body } = options
  const url = `${YOOKASSA_API_URL}/${endpoint}`

  // Базовая авторизация для YooKassa API
  const auth = Buffer.from(`${YOOKASSA_SHOP_ID}:${YOOKASSA_SECRET_KEY}`).toString('base64')

  const fetchOptions: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${auth}`,
      'Idempotence-Key': `${Date.now()}-${Math.random()}`, // Уникальный ключ для идемпотентности
    },
  }

  if (body && (method === 'POST' || method === 'PATCH')) {
    fetchOptions.body = JSON.stringify(body)
  }

  console.log(`YooKassa API ${method} ${url}`)

  return fetch(url, fetchOptions)
}

function parseJsonSafe(response: Response): Promise<Record<string, unknown>> {
  return response.text().then((text) => {
    if (!text) return {}
    try {
      return JSON.parse(text) as Record<string, unknown>
    } catch {
      throw new Error(`Invalid JSON response from YooKassa (${response.status})`)
    }
  })
}

function buildReceiptItems(
  items: Array<{ name?: string; quantity?: number; price?: number }>,
  amount: number,
  shippingAmount: number,
  currency: string,
) {
  const normalizedItems = items
    .map((item) => ({
      name: String(item.name || 'Товар').substring(0, 128),
      quantity: Math.max(1, Number(item.quantity) || 1),
      price: Number(item.price),
    }))
    .filter((item) => Number.isFinite(item.price) && item.price > 0)

  if (normalizedItems.length === 0) {
    throw new Error('No valid items for receipt')
  }

  const shipping = Math.max(0, Number(shippingAmount) || 0)
  const productsTarget = Math.max(0.01, Number((amount - shipping).toFixed(2)))
  const sumItems = normalizedItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  )
  const ratio = sumItems > 0 ? productsTarget / sumItems : 1

  let runningTotal = 0
  const formattedItems = normalizedItems.map((item, index) => {
    const isLast = index === normalizedItems.length - 1
    let discountedPrice = Math.round(item.price * ratio * 100) / 100

    if (isLast) {
      discountedPrice = Math.round(
        ((productsTarget - runningTotal) / item.quantity) * 100,
      ) / 100
    }

    if (discountedPrice <= 0) discountedPrice = 0.01

    if (!isLast) {
      runningTotal += Number((discountedPrice * item.quantity).toFixed(2))
    }

    return {
      description: item.name,
      quantity: item.quantity,
      amount: {
        value: discountedPrice.toFixed(2),
        currency,
      },
      vat_code: 4,
      payment_mode: 'full_payment',
      payment_subject: 'commodity',
    }
  })

  if (shipping > 0) {
    formattedItems.push({
      description: 'Доставка',
      quantity: 1,
      amount: {
        value: shipping.toFixed(2),
        currency,
      },
      vat_code: 4,
      payment_mode: 'full_payment',
      payment_subject: 'service',
    })
  }

  return formattedItems
}

// ============================================
// POST Handler - Создание платежа
// ============================================
export async function POST(request: NextRequest) {
  try {
    if (!YOOKASSA_SHOP_ID || !YOOKASSA_SECRET_KEY) {
      return createResponse(
        { error: 'YooKassa credentials not configured' },
        500
      )
    }

    const body = await request.json()
    const {
      amount, // Итоговая сумма к оплате
      currency = 'RUB',
      description,
      orderId,
      returnUrl,
      userEmail,
      items = [], // Список товаров из корзины
      shippingAmount = 0,
      metadata = {},
    } = body

    const normalizedAmount = Number(amount)

    // Валидация обязательных полей
    if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0 || !description) {
      return createResponse(
        { error: 'Amount and description are required' },
        400
      )
    }

    const normalizedShipping = Number(shippingAmount) || 0
    const shippingCarrier =
      (metadata?.shippingCarrier as string | undefined) ||
      (body.shippingCarrier as string | undefined)
    const allowFreeShipping =
      body.allowFreeShipping === true ||
      metadata?.allowFreeShipping === true ||
      metadata?.allowFreeShipping === 'true'
    const validCarriers = new Set(['cdek', 'yandex', 'ozon'])

    const effectiveShipping = allowFreeShipping ? 0 : normalizedShipping

    if (
      shippingCarrier &&
      validCarriers.has(String(shippingCarrier)) &&
      effectiveShipping <= 0 &&
      !allowFreeShipping
    ) {
      return createResponse(
        { error: 'Shipping amount must be greater than zero when a carrier is selected' },
        400,
      )
    }

    if (effectiveShipping > 0 && normalizedAmount + 0.009 < effectiveShipping) {
      return createResponse(
        { error: 'Order amount is less than shipping cost' },
        400,
      )
    }

    const catalogSubtotal = (items as Array<{ price?: number; quantity?: number }>).reduce(
      (sum, item) => {
        const price = Number(item.price)
        const qty = Math.max(1, Number(item.quantity) || 1)
        return sum + (Number.isFinite(price) && price > 0 ? price * qty : 0)
      },
      0,
    )

    if (
      effectiveShipping > 0 &&
      normalizedAmount <= effectiveShipping + 0.009 &&
      catalogSubtotal > effectiveShipping + 0.01
    ) {
      return createResponse(
        {
          error:
            'Order amount must include product total in addition to shipping. Refresh checkout and try again.',
          code: 'PAYMENT_AMOUNT_MISMATCH',
        },
        400,
      )
    }

    if (orderId) {
      const stock = await checkCheckoutStockViaRest(String(orderId))
      if (!stock.available) {
        return createResponse(
          {
            error: stock.message,
            message: stock.message,
            code: 'INSUFFICIENT_STOCK',
            items: stock.items,
          },
          409,
        )
      }
    }

    const defaultReturnUrl =
      returnUrl || getCheckoutSuccessUrl(request.headers.get('origin'))

    let receipt = null
    if (userEmail && items.length > 0) {
      try {
        receipt = {
          customer: {
            email: userEmail,
          },
          items: buildReceiptItems(items, normalizedAmount, effectiveShipping, currency),
        }
      } catch (receiptError: unknown) {
        const message =
          receiptError instanceof Error
            ? receiptError.message
            : 'Failed to build payment receipt'
        console.error('YooKassa receipt build error:', message)
        return createResponse({ error: message }, 400)
      }
    }

    // Данные для создания платежа
    const paymentData: any = {
      amount: {
        value: normalizedAmount.toFixed(2),
        currency: currency,
      },
      confirmation: {
        type: 'embedded', // Используем embedded для виджета
        return_url: defaultReturnUrl,
      },
      capture: true, // Автоматическое подтверждение платежа
      description: description,
      metadata: {
        orderId: orderId || '',
        checkoutId: orderId || '',
        ...metadata,
        allowFreeShipping: allowFreeShipping ? 'true' : 'false',
      },
    }

    // Добавляем чек, если он сформирован
    if (receipt) {
      paymentData.receipt = receipt
    }

    // ЛОГИРУЕМ ПОЛНЫЙ ЗАПРОС (для отладки на сервере)
    console.log('YooKassa full payment payload:', JSON.stringify(paymentData, null, 2))

    console.log('YooKassa creating payment:', paymentData)

    // Создаём платеж
    const response = await yookassaRequest('payments', {
      method: 'POST',
      body: paymentData,
    })

    const result = await parseJsonSafe(response)

    if (!response.ok) {
      console.error('YooKassa API error:', result)
      const desc = String(result.description || result.code || '')
      const isAuthError = /shopId|secret key|secret_key|Invalid credentials|authorization/i.test(desc)
      const userError = isAuthError
        ? 'Ошибка настройки оплаты (shopId или секретный ключ). Проверьте YOOKASSA_SHOP_ID и YOOKASSA_SECRET_KEY в настройках сервера и перевыпустите ключ в личном кабинете ЮKassa.'
        : (desc || 'Не удалось создать платёж')
      return createResponse(
        { error: userError, message: userError, details: result },
        response.status
      )
    }

    // Возвращаем confirmation_token для виджета
    const confirmation = result.confirmation as { confirmation_token?: string } | undefined
    const confirmationToken = confirmation?.confirmation_token

    if (!confirmationToken) {
      console.error('YooKassa: No confirmation_token in response:', result)
      return createResponse(
        { error: 'No confirmation token received from YooKassa' },
        500
      )
    }

    console.log('YooKassa payment created:', {
      paymentId: result.id,
      confirmationToken: confirmationToken.substring(0, 20) + '...',
    })

    return createResponse({
      success: true,
      paymentId: result.id,
      confirmationToken: confirmationToken,
      status: result.status,
      amount: result.amount,
    })

  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Unexpected payment error'
    console.error('YooKassa POST error:', message)
    return createResponse(
      {
        error: message,
        message,
      },
      500
    )
  }
}

// ============================================
// OPTIONS Handler (CORS)
// ============================================
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}

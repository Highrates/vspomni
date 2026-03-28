import { NextRequest, NextResponse } from 'next/server'

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
      metadata = {},
    } = body

    // Валидация обязательных полей
    if (!amount || !description) {
      return createResponse(
        { error: 'Amount and description are required' },
        400
      )
    }

    // Формируем URL для возврата после оплаты
    const defaultReturnUrl = returnUrl ||
      (typeof window !== 'undefined'
        ? `${window.location.origin}/checkout/success`
        : `${request.headers.get('origin') || 'http://localhost:3000'}/checkout/success`)

    // Подготовка чека для 54-ФЗ
    let receipt = null
    if (userEmail && items.length > 0) {
      // Сумма чека должна строго совпадать с amount. 
      // Если есть промокод, totalPrice может быть больше amount.
      // Распределяем скидку пропорционально.
      const sumItems = items.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0)
      const ratio = amount / sumItems

      let runningTotal = 0
      const formattedItems = items.map((item: any, index: number) => {
        const isLast = index === items.length - 1

        // Вычисляем новую цену товара с учётом скидки
        let discountedPrice = Math.round(item.price * ratio * 100) / 100

        // Корректировка последнего товара для точного совпадения суммы
        if (isLast) {
          // Оставшаяся сумма делится на количество последнего товара
          discountedPrice = Math.round(((amount - runningTotal) / item.quantity) * 100) / 100
        }

        // Защита от нулевой цены (минимум 0.01)
        if (discountedPrice <= 0) discountedPrice = 0.01

        if (!isLast) {
          runningTotal += Number((discountedPrice * item.quantity).toFixed(2))
        }

        return {
          description: item.name.substring(0, 128),
          quantity: item.quantity,
          amount: {
            value: discountedPrice.toFixed(2),
            currency: currency,
          },
          vat_code: 4, // Без НДС
          payment_mode: 'full_payment',
          payment_subject: 'commodity',
        }
      })

      receipt = {
        customer: {
          email: userEmail,
        },
        items: formattedItems,
      }
    }

    // Данные для создания платежа
    const paymentData: any = {
      amount: {
        value: amount.toFixed(2), // Сумма в формате "100.00"
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
        ...metadata,
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

    const result = await response.json()

    if (!response.ok) {
      console.error('YooKassa API error:', result)
      const desc = (result.description || result.code || '') as string
      const isAuthError = /shopId|secret key|secret_key|Invalid credentials|authorization/i.test(desc)
      const userError = isAuthError
        ? 'Ошибка настройки оплаты (shopId или секретный ключ). Проверьте YOOKASSA_SHOP_ID и YOOKASSA_SECRET_KEY в настройках сервера и перевыпустите ключ в личном кабинете ЮKassa.'
        : (result.description || 'Не удалось создать платёж')
      return createResponse(
        { error: userError, details: result },
        response.status
      )
    }

    // Возвращаем confirmation_token для виджета
    const confirmationToken = result.confirmation?.confirmation_token

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

  } catch (error: any) {
    console.error('YooKassa POST error:', error)
    return createResponse(
      {
        error: 'Internal server error',
        message: error.message,
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

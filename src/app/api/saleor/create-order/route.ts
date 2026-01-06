import { NextRequest, NextResponse } from 'next/server'

// ============================================
// Saleor Custom Checkout Creation API
// Создает checkout без проверки наличия через кастомный REST endpoint в Saleor
// ============================================

// Получаем базовый URL Saleor из переменной окружения
const GRAPHQL_URL = process.env.GRAPHQL_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_URL || 'https://vspomni.store/graphql/'
// Вычисляем базовый URL (убираем /graphql/ в конце)
const SALEOR_BASE_URL = GRAPHQL_URL.replace(/\/graphql\/?$/, '') || 'https://vspomni.store'

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
 * Выполнить запрос к кастомному REST API Saleor
 */
async function saleorRestRequest(
  endpoint: string,
  body: Record<string, unknown>
): Promise<Response> {
  const url = `${SALEOR_BASE_URL}${endpoint}`
  
  console.log('Calling Saleor REST API:', url)
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  return response
}

// ============================================
// POST Handler - Создание checkout без проверки наличия
// ============================================
export async function POST(request: NextRequest) {
  console.log('POST /api/saleor/create-order called')
  console.log('SALEOR_BASE_URL:', SALEOR_BASE_URL)
  
  try {
    const body = await request.json()
    console.log('Request body:', JSON.stringify(body, null, 2))
    const {
      lines,
      userEmail,
      channel = 'vspomni-site',
    } = body

    // Валидация обязательных полей
    if (!lines || !Array.isArray(lines) || lines.length === 0) {
      return createResponse(
        { error: 'Lines are required and must be a non-empty array' },
        400
      )
    }

    console.log('Creating checkout without stock check:', {
      channel,
      userEmail,
      linesCount: lines.length,
    })

    // Выполняем запрос к кастомному REST endpoint в Saleor
    const response = await saleorRestRequest('/checkout/create-without-stock-check/', {
      channel,
      email: userEmail,
      lines: lines.map((line: any) => ({
        variantId: line.variantId,
        quantity: line.quantity,
      })),
    })

    // Проверяем content-type перед парсингом JSON
    const contentType = response.headers.get('content-type') || ''
    const responseText = await response.text()
    let result: any

    if (contentType.includes('application/json')) {
      try {
        result = JSON.parse(responseText)
      } catch (jsonError) {
        console.error('Failed to parse JSON response:', {
          status: response.status,
          contentType,
          preview: responseText.substring(0, 200),
        })
        return createResponse(
          { 
            error: 'Invalid JSON response from Saleor API',
            message: 'Response claimed to be JSON but parsing failed',
            status: response.status,
          },
          response.status || 500
        )
      }
    } else {
      // Если ответ не JSON (например, HTML error page)
      console.error('Saleor REST API returned non-JSON response:', {
        status: response.status,
        statusText: response.statusText,
        contentType,
        preview: responseText.substring(0, 200),
      })
      
      return createResponse(
        { 
          error: 'Saleor API returned an error page',
          message: `Expected JSON but received ${contentType}. Status: ${response.status} ${response.statusText}`,
          status: response.status,
        },
        response.status || 500
      )
    }


    if (!response.ok) {
      console.error('Saleor REST API error:', result)
      return createResponse(
        { 
          error: result.error || 'Failed to create checkout',
          details: result,
        },
        response.status
      )
    }

    if (!result.checkout || !result.checkout.token) {
      return createResponse(
        { error: 'Checkout was not created' },
        500
      )
    }

    console.log('Checkout created without stock check:', {
      checkoutToken: result.checkout.token,
    })

    return createResponse({
      success: true,
      checkout: {
        id: result.checkout.token,
        token: result.checkout.token,
      },
    })

  } catch (error: any) {
    console.error('Saleor checkout creation error:', error)
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
// GET Handler - для проверки доступности endpoint
// ============================================
export async function GET() {
  return createResponse({
    success: true,
    message: 'Saleor create-order API is available',
    baseUrl: SALEOR_BASE_URL,
  })
}

// ============================================
// OPTIONS Handler (CORS)
// ============================================
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}

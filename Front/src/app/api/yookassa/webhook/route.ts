import { NextRequest, NextResponse } from 'next/server'
import { apiBase } from '@/api/apiClient'

/**
 * Тонкий прокси вебхука ЮKassa → Nest `POST /api/v1/orders/yookassa/webhook`.
 *
 * Заказ и оплату финализирует Nest (mark-paid, склад, письма). Предпочтительно указать в ЛК ЮKassa
 * URL Nest напрямую; этот маршрут нужен, пока в ЛК прописан старый адрес Front
 * (`/api/yookassa/webhook`). Проверку подписи/IP делает Nest: пробрасываем секрет и client IP.
 */
export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  const forwardedFor =
    request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip')
  if (forwardedFor) headers['x-forwarded-for'] = forwardedFor
  const secret =
    request.headers.get('x-yookassa-webhook-secret') ||
    process.env.YOOKASSA_WEBHOOK_SECRET
  if (secret) headers['x-yookassa-webhook-secret'] = secret

  try {
    const res = await fetch(`${apiBase()}/orders/yookassa/webhook`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      cache: 'no-store',
    })
    const text = await res.text()
    return new NextResponse(text || null, {
      status: res.status,
      headers: { 'Content-Type': res.headers.get('content-type') || 'application/json' },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Nest unavailable'
    console.error('YooKassa webhook proxy error:', message)
    // 5xx → ЮKassa повторит доставку
    return NextResponse.json({ error: message }, { status: 502 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { exchangeOzonAuthCode } from '@/lib/ozonSellerAuth'

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')
  const error = req.nextUrl.searchParams.get('error')

  if (error) {
    return new NextResponse(
      `<html><body><h1>Ozon OAuth ошибка</h1><p>${error}</p></body></html>`,
      { status: 400, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
    )
  }

  if (!code) {
    return new NextResponse(
      '<html><body><h1>Ozon OAuth</h1><p>Нет параметра code в redirect.</p></body></html>',
      { status: 400, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
    )
  }

  try {
    const tokens = await exchangeOzonAuthCode(code)
    const html = `<!DOCTYPE html>
<html lang="ru">
<head><meta charset="utf-8"><title>Ozon OAuth</title></head>
<body style="font-family:system-ui;max-width:720px;margin:2rem auto;padding:0 1rem">
  <h1>Токен Ozon получен</h1>
  <p>Добавьте в <code>/var/www/vspomni-front/.env</code> (или локальный <code>.env.local</code>):</p>
  <pre style="background:#f4f4f4;padding:1rem;overflow:auto">OZON_REFRESH_TOKEN=${tokens.refresh_token || '(не пришёл — проверьте access_type=offline)'}
# опционально, пока не истечёт:
OZON_ACCESS_TOKEN=${tokens.access_token || ''}</pre>
  <p>Затем: <code>pm2 restart vspomni-front --update-env</code></p>
  <p><small>access_token живёт ~${tokens.expires_in ?? 3600} сек; refresh_token используется для автообновления.</small></p>
</body></html>`
    return new NextResponse(html, {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'OAuth exchange failed'
    return new NextResponse(
      `<html><body><h1>Ozon OAuth</h1><pre>${msg}</pre></body></html>`,
      { status: 502, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
    )
  }
}

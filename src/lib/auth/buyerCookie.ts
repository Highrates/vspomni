/** httpOnly cookie с JWT покупателя (как Admin `vspomni_admin_token`). */
export const BUYER_ACCESS_TOKEN_COOKIE = 'vspomni_buyer_token'

/** Совпадает с Nest `JWT_EXPIRES_IN` (default 12h). */
export const BUYER_TOKEN_MAX_AGE_SEC = 60 * 60 * 12

export function buyerCookieSecure(request: Request): boolean {
  const v = process.env.BUYER_COOKIE_SECURE?.toLowerCase()
  if (v === '0' || v === 'false' || v === 'off') return false
  if (v === '1' || v === 'true' || v === 'on') return true
  const fwd = request.headers
    .get('x-forwarded-proto')
    ?.split(',')[0]
    ?.trim()
    .toLowerCase()
  if (fwd === 'https') return true
  if (fwd === 'http') return false
  try {
    return new URL(request.url).protocol === 'https:'
  } catch {
    return process.env.NODE_ENV === 'production'
  }
}

/** Nest origin+`/api/v1` для server-side proxy. */
export function nestApiV1Base(): string {
  const raw =
    process.env.NEXT_PUBLIC_API_URL?.trim() || 'http://127.0.0.1:3011/api/v1'
  let t = raw.replace(/\/+$/, '')
  if (/\/graphql\/?$/i.test(t)) t = 'http://127.0.0.1:3011/api/v1'
  if (!/^https?:\/\//i.test(t)) {
    if (t.startsWith('/')) return `http://127.0.0.1:3011${t}`
    return `http://127.0.0.1:3011/api/v1`
  }
  if (!/\/api\/v\d+$/i.test(t)) {
    try {
      return `${new URL(t).origin}/api/v1`
    } catch {
      return 'http://127.0.0.1:3011/api/v1'
    }
  }
  return t
}

/** Пути Nest, ответ которых содержит access_token → ставим cookie. */
export const BUYER_AUTH_SET_COOKIE_PATHS = new Set([
  'auth/login',
  'auth/register/complete',
])

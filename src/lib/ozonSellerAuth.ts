/** Чтение env в runtime (process.env['KEY']), чтобы не зашивалось при build. */
function readEnv(key: string): string | undefined {
  const v = process.env[key]
  return typeof v === 'string' && v.trim() ? v.trim() : undefined
}

/**
 * Авторизация Ozon Seller API (https://api-seller.ozon.ru).
 * Поддерживает Client-Id + Api-Key или OAuth-токен частного приложения.
 */

const OZON_API_BASE = (readEnv('OZON_API_URL') || 'https://api-seller.ozon.ru').replace(/\/$/, '')
const OZON_OAUTH_TOKEN_URL =
  readEnv('OZON_OAUTH_TOKEN_URL') || `${OZON_API_BASE}/v1/oauth/token`
const OZON_OAUTH_AUTHORIZE_URL =
  readEnv('OZON_OAUTH_AUTHORIZE_URL') ||
  'https://seller.ozon.ru/app/appstore/oauth/authorize'

const DEFAULT_OAUTH_SCOPE = [
  'seller-api.ozon-logistics',
  'seller-api.product',
  'seller-api.posting-fbs',
  'seller-api.posting-fbo',
  'seller-api.returns',
  'seller-api.report',
].join(' ')

let cachedAccessToken: string | null = null
let tokenExpiry = 0

export type OzonAuthHeaders = Record<string, string>

function getAppCredentials() {
  return {
    clientId: readEnv('OZON_CLIENT_ID'),
    clientSecret: readEnv('OZON_CLIENT_SECRET'),
  }
}

function getSellerId(): string | undefined {
  return readEnv('OZON_SELLER_ID') || readEnv('OZON_CLIENT_ID_NUM')
}

function getApiKey(): string | undefined {
  return readEnv('OZON_API_KEY')
}

function getRefreshToken(): string | undefined {
  return readEnv('OZON_REFRESH_TOKEN') || readEnv('OZON_OAUTH_REFRESH_TOKEN')
}

function getRedirectUri(): string {
  const env = readEnv('OZON_OAUTH_REDIRECT_URI')
  if (env) return env
  const site = readEnv('NEXT_PUBLIC_SALEOR_API_URL') || 'https://vspomni.store'
  return `${site.replace(/\/$/, '')}/api/ozon-delivery/oauth/callback`
}

export function getOzonApiBase(): string {
  return OZON_API_BASE
}

export function buildOzonAuthorizeUrl(state?: string): string {
  const { clientId } = getAppCredentials()
  if (!clientId) {
    throw new Error('OZON_CLIENT_ID (UUID приложения) не задан')
  }
  const url = new URL(OZON_OAUTH_AUTHORIZE_URL)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('access_type', 'offline')
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('redirect_uri', getRedirectUri())
  url.searchParams.set('scope', readEnv('OZON_OAUTH_SCOPE') || DEFAULT_OAUTH_SCOPE)
  url.searchParams.set('state', state || crypto.randomUUID())
  return url.toString()
}

type TokenResponse = {
  access_token?: string
  refresh_token?: string
  expires_in?: number
  token_type?: string
  error?: string
  message?: string
}

async function exchangeToken(body: Record<string, string>): Promise<TokenResponse> {
  const { clientId, clientSecret } = getAppCredentials()
  if (!clientId || !clientSecret) {
    throw new Error('OZON_CLIENT_ID и OZON_CLIENT_SECRET не заданы')
  }

  const res = await fetch(OZON_OAUTH_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      ...body,
    }),
    cache: 'no-store',
  })

  const text = await res.text()
  let data: TokenResponse
  try {
    data = JSON.parse(text) as TokenResponse
  } catch {
    throw new Error(`Ozon OAuth: неверный ответ (${res.status})`)
  }

  if (!res.ok || !data.access_token) {
    throw new Error(
      data.message || data.error || `Ozon OAuth failed (${res.status})`,
    )
  }
  return data
}

export async function exchangeOzonAuthCode(code: string): Promise<TokenResponse> {
  return exchangeToken({
    grant_type: 'authorization_code',
    code,
    redirect_uri: getRedirectUri(),
  })
}

function missingCredentialsError(): string {
  const sellerId = getSellerId()
  const apiKey = getApiKey()
  if (apiKey && !sellerId) {
    return 'Ozon: задан OZON_API_KEY, но нет OZON_SELLER_ID=3814167 в .env'
  }
  if (sellerId && !apiKey) {
    return 'Ozon: задан OZON_SELLER_ID, но нет OZON_API_KEY в .env (seller.ozon.ru → API ключи)'
  }
  return (
    'Ozon: добавьте OZON_SELLER_ID=3814167 и OZON_API_KEY в .env, затем npm run build && pm2 restart vspomni-front --update-env'
  )
}

async function refreshOzonAccessToken(): Promise<string> {
  const refreshToken = getRefreshToken()
  if (!refreshToken) {
    throw new Error(missingCredentialsError())
  }

  const data = await exchangeToken({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  })

  cachedAccessToken = data.access_token!
  tokenExpiry = Date.now() + (data.expires_in ?? 3600) * 1000
  return cachedAccessToken
}

export async function getOzonAuthHeaders(): Promise<OzonAuthHeaders> {
  const apiKey = getApiKey()
  const sellerId = getSellerId()

  if (apiKey && sellerId) {
    return {
      'Client-Id': sellerId,
      'Api-Key': apiKey,
    }
  }

  const staticToken = readEnv('OZON_ACCESS_TOKEN')
  if (staticToken) {
    return { Authorization: `Bearer ${staticToken}` }
  }

  if (cachedAccessToken && Date.now() < tokenExpiry - 60_000) {
    return { Authorization: `Bearer ${cachedAccessToken}` }
  }

  if (!getRefreshToken() && !readEnv('OZON_ACCESS_TOKEN')) {
    throw new Error(missingCredentialsError())
  }

  const token = await refreshOzonAccessToken()
  return { Authorization: `Bearer ${token}` }
}

export function describeOzonAuthSetup(): string {
  const sellerId = getSellerId()
  const apiKey = getApiKey()
  const refresh = getRefreshToken()
  if (sellerId && apiKey) {
    return `Seller API: Client-Id=${sellerId} + Api-Key`
  }
  if (refresh) return 'Seller API: OAuth (refresh token)'
  if (readEnv('OZON_ACCESS_TOKEN')) return 'Seller API: OAuth (access token)'
  return 'не настроено — нужны OZON_SELLER_ID+OZON_API_KEY или OAuth'
}

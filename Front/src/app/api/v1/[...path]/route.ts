/**
 * Same-origin BFF → Nest `/api/v1/*`.
 * JWT покупателя в httpOnly cookie (не localStorage); сюда же кладём Bearer.
 */
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import {
  BUYER_ACCESS_TOKEN_COOKIE,
  BUYER_AUTH_SET_COOKIE_PATHS,
  BUYER_TOKEN_MAX_AGE_SEC,
  buyerCookieSecure,
  nestApiV1Base,
} from '@/lib/auth/buyerCookie'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type Ctx = { params: Promise<{ path: string[] }> }

async function proxy(req: NextRequest, ctx: Ctx): Promise<NextResponse> {
  const { path: segments } = await ctx.params
  const subPath = segments.map(encodeURIComponent).join('/')
  const incoming = new URL(req.url)
  const target = `${nestApiV1Base()}/${subPath}${incoming.search}`

  const headers = new Headers()
  const pass = ['content-type', 'accept', 'accept-language', 'x-request-id'] as const
  for (const h of pass) {
    const v = req.headers.get(h)
    if (v) headers.set(h, v)
  }

  const jar = await cookies()
  const cookieToken = jar.get(BUYER_ACCESS_TOKEN_COOKIE)?.value?.trim()
  const authHeader = req.headers.get('authorization')?.trim()
  let bearerFromClient: string | null = null
  if (authHeader?.toLowerCase().startsWith('bearer ')) {
    bearerFromClient = authHeader.slice(7).trim() || null
  }
  const token = bearerFromClient || cookieToken || null
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const init: RequestInit = {
    method: req.method,
    headers,
    cache: 'no-store',
    redirect: 'manual',
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    init.body = await req.arrayBuffer()
  }

  let nestRes: Response
  try {
    nestRes = await fetch(target, init)
  } catch {
    return NextResponse.json({ message: 'Нет связи с API' }, { status: 502 })
  }

  const buf = await nestRes.arrayBuffer()
  const outHeaders = new Headers()
  const ct = nestRes.headers.get('content-type')
  if (ct) outHeaders.set('content-type', ct)

  const out = new NextResponse(buf, {
    status: nestRes.status,
    headers: outHeaders,
  })

  const secure = buyerCookieSecure(req)
  const cookieBase = {
    httpOnly: true,
    secure,
    sameSite: 'lax' as const,
    path: '/',
  }

  const clearBuyerCookie = () => {
    out.cookies.set({
      ...cookieBase,
      name: BUYER_ACCESS_TOKEN_COOKIE,
      value: '',
      maxAge: 0,
    })
  }

  if (subPath === 'auth/logout' || nestRes.status === 401) {
    clearBuyerCookie()
    return out
  }

  if (nestRes.ok) {
    // Login / register complete → cookie из тела
    if (BUYER_AUTH_SET_COOKIE_PATHS.has(subPath)) {
      try {
        const json = JSON.parse(new TextDecoder().decode(buf)) as {
          access_token?: string
        }
        if (typeof json.access_token === 'string' && json.access_token) {
          out.cookies.set({
            ...cookieBase,
            name: BUYER_ACCESS_TOKEN_COOKIE,
            value: json.access_token,
            maxAge: BUYER_TOKEN_MAX_AGE_SEC,
          })
        }
      } catch {
        /* non-JSON */
      }
    }
    // Миграция: клиент прислал legacy Bearer (localStorage) на /auth/me
    if (subPath === 'auth/me' && bearerFromClient && !cookieToken) {
      out.cookies.set({
        ...cookieBase,
        name: BUYER_ACCESS_TOKEN_COOKIE,
        value: bearerFromClient,
        maxAge: BUYER_TOKEN_MAX_AGE_SEC,
      })
    }
  }

  return out
}

export const GET = proxy
export const POST = proxy
export const PUT = proxy
export const PATCH = proxy
export const DELETE = proxy
export const OPTIONS = proxy

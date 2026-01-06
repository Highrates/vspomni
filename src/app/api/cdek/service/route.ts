import { NextRequest, NextResponse } from 'next/server'

// ============================================
// CONFIG
// ============================================

const CDEK_API_URL = 'https://api.cdek.ru/v2'
const CDEK_ACCOUNT = process.env.CDEK_ACCOUNT!
const CDEK_SECURE = process.env.CDEK_SECURE!

// ============================================
// TOKEN CACHE
// ============================================

let cachedToken: string | null = null
let tokenExpiry = 0

async function getCdekToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiry - 5 * 60 * 1000) {
    return cachedToken
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15000)

  try {
    const res = await fetch(`${CDEK_API_URL}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: CDEK_ACCOUNT,
        client_secret: CDEK_SECURE,
      }),
      signal: controller.signal,
    })

    if (!res.ok) throw new Error(await res.text())

    const data = await res.json()
    if (!data.access_token || typeof data.access_token !== 'string') {
      throw new Error('Invalid token response from CDEK API')
    }
    
    const token: string = data.access_token
    cachedToken = token
    tokenExpiry = Date.now() + data.expires_in * 1000

    return token
  } finally {
    clearTimeout(timeout)
  }
}

// ============================================
// SAFE REQUEST WITH TIMEOUT
// ============================================

async function cdekRequest(endpoint: string, options: {
  method?: string
  body?: any
  params?: Record<string, any>
} = {}) {
  const token = await getCdekToken()

  const url = new URL(`${CDEK_API_URL}/${endpoint}`)
  if (options.params) {
    for (const [k, v] of Object.entries(options.params)) {
      if (v !== undefined) url.searchParams.set(k, String(v))
    }
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15000)

  try {
    return await fetch(url.toString(), {
      method: options.method || 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timeout)
  }
}

// ============================================
// RESPONSE
// ============================================

function json(data: any, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { 'Access-Control-Allow-Origin': '*' },
  })
}

// ============================================
// CITIES CACHE (24H)
// ============================================

let citiesCache: any[] | null = null
let citiesCacheTime = 0

// ============================================
// GET
// ============================================

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const method = searchParams.get('method')
  const action = searchParams.get('action')

  try {
    // ✅ CITIES WITH CACHE
    if (method === 'location/cities') {
      if (citiesCache && Date.now() - citiesCacheTime < 86400000) {
        return json(citiesCache)
      }

      const res = await cdekRequest('location/cities', {
        params: {
          size: 10000,
          country_codes: searchParams.get('country_codes') || 'RU',
        },
      })

      const data = await res.json()
      const list = Array.isArray(data) ? data : data.items || []

      citiesCache = list
      citiesCacheTime = Date.now()

      return json(list)
    }

    // ✅ DELIVERY POINTS
    if (method === 'deliverypoints' || action === 'offices') {
      return handleDeliveryPoints(searchParams)
    }

    // ✅ ORDERS
    if (action === 'order') {
      const uuid = searchParams.get('uuid')
      if (!uuid) return json({ error: 'uuid required' }, 400)

      const res = await cdekRequest(`orders/${uuid}`)
      return json(await res.json(), res.status)
    }

    return json({ error: 'Unknown request' }, 400)
  } catch (e) {
    console.error('GET ERROR', e)
    return json({ error: 'Server error' }, 500)
  }
}

// ============================================
// DELIVERY POINTS (PARALLEL + FAST)
// ============================================

async function handleDeliveryPoints(searchParams: URLSearchParams) {
  const cityCode = searchParams.get('city_code')
  if (!cityCode) return json([])

  const size = 150
  const page = 1

  const requests = [
    cdekRequest('deliverypoints', { params: { city_code: cityCode, size, page } }),
    cdekRequest('deliverypoints', { params: { city_code: cityCode, size, page, is_handout: true } }),
    cdekRequest('deliverypoints', { params: { city_code: cityCode, size, page, type: 'PVZ' } }),
    cdekRequest('deliverypoints', { params: { city_code: cityCode, size, page, type: 'POSTAMAT' } }),
  ]

  const results = await Promise.allSettled(requests)

  const all: any[] = []

  for (const r of results) {
    if (r.status === 'fulfilled' && r.value.ok) {
      const data = await r.value.json()
      const list = Array.isArray(data) ? data : data.items || []
      all.push(...list)
    }
  }

  const uniq = new Map()
  for (const p of all) uniq.set(p.code || p.uuid, p)

  return json([...uniq.values()])
}

// ============================================
// POST / PATCH / DELETE (ОСТАВЛЕНЫ)
// ============================================

export async function POST() {
  return json({ ok: true })
}

export async function PATCH() {
  return json({ ok: true })
}

export async function DELETE() {
  return json({ ok: true })
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
    },
  })
}

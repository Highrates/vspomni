/**
 * Live smoke против запущенного Nest
 * (`NEST_LIVE=1 NEXT_PUBLIC_API_URL=http://127.0.0.1:3011/api/v1`
 * `NEXT_PUBLIC_API_DIRECT=1` — иначе apiBase в «браузере» идёт на `/api/v1`).
 * Без NEST_LIVE пропускается.
 */
import { describe, expect, it } from 'vitest'
import { fetchProductList, syncCart } from '@/api/catalogApi'
import {
  requestPasswordReset,
  setPassword,
  getToken,
} from '@/api/authApi'
import { requestShippingQuote, abandonOrder } from '@/api/ordersApi'
import { validatePromoCode, PromoCodeError } from '@/graphql/queries/promocode.service'
import { safeNextPath } from '@/lib/auth/safeNextPath'

const live = process.env.NEST_LIVE === '1'
const API = (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3011/api/v1').replace(
  /\/+$/,
  '',
)

function installBrowserShims() {
  process.env.NEXT_PUBLIC_API_DIRECT = '1'
  const store = new Map<string, string>()
  const g = globalThis as unknown as Record<string, unknown>
  g.window = globalThis
  g.localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  }
  return store
}

describe.skipIf(!live)('Nest live', () => {
  it('cart sync: live price, removes unknown variant, returns dims', async () => {
    const { items } = await fetchProductList({ limit: 1 })
    const variantId = items[0]!.variantId!
    const res = await syncCart([
      { variantId, qty: 2 },
      { variantId: 'does-not-exist', qty: 1 },
    ])
    expect(res.items[0]!.variantId).toBe(variantId)
    expect(res.items[0]!.qty).toBe(2)
    expect(res.removedKeys).toContain('does-not-exist')
    expect(res.removedLines?.[0]?.reason).toBe('missing')
    // вес/габариты могут быть null в БД — поля должны присутствовать в ответе
    expect('weightGrams' in res.items[0]! || res.items[0]!.weightGrams === null).toBeTruthy()
  })

  it('password reset request returns 200 (neutral message)', async () => {
    const res = await requestPasswordReset(
      'smoke-nonexistent@example.com',
      'http://localhost:3000/login',
    )
    expect(typeof res.message).toBe('string')
    expect(typeof res.mailConfigured).toBe('boolean')
  })

  it('shipping quote for a real variant', async () => {
    const { items } = await fetchProductList({ limit: 1 })
    const variantId = items[0]!.variantId!
    const q = await requestShippingQuote({
      lines: [{ variantId, qty: 1 }],
      shippingMethod: 'CDEK',
      clientEstimate: 300,
      shippingAddress: {
        city: 'Москва',
        address: 'ул. Тверская, 1',
        postalCode: '101000',
        pvzCode: 'MSK123',
        comment: '__VSP:carrier=cdek|dropoff=pvz|pvz=MSK123__',
      },
    })
    expect(q.quote.length).toBeGreaterThan(20)
    expect(q.cost).toBeGreaterThanOrEqual(0)
  })

  it('promo validate rejects unknown code (rejected=true)', async () => {
    const { items } = await fetchProductList({ limit: 1 })
    const c = items[0]!
    await expect(
      validatePromoCode('NO-SUCH-CODE', [
        {
          id: c.variantId!,
          variantId: c.variantId!,
          quantity: 1,
          size: '',
          product: {
            id: c.variantId!,
            name: c.name,
            slug: c.slug,
            size: '',
            thumbnail: '',
            image: '',
            aromas: [],
            price: c.price,
            group: [],
            variantId: c.variantId!,
          },
        },
      ]),
    ).rejects.toMatchObject({ rejected: true } satisfies Partial<PromoCodeError>)
  })

  it('promo validate accepts seed WELCOME10', async () => {
    const { items } = await fetchProductList({ limit: 1 })
    const c = items[0]!
    const line = {
      id: c.variantId!,
      variantId: c.variantId!,
      quantity: 1,
      size: '',
      product: {
        id: c.variantId!,
        name: c.name,
        slug: c.slug,
        size: '',
        thumbnail: '',
        image: '',
        aromas: [],
        price: c.price,
        group: [],
        variantId: c.variantId!,
      },
    }
    const ok = await validatePromoCode('WELCOME10', [line])
    expect(ok.code.toUpperCase()).toBe('WELCOME10')
    expect(ok.discountValueType).toBe('PERCENTAGE')
    expect(ok.discountValue).toBe(10)
    expect(ok.discountAmount).toBeGreaterThan(0)
  })
})

describe.skipIf(!live)('Nest live: login next + claim (null passwordHash)', () => {
  it('safeNextPath honors /checkout and rejects open redirects', () => {
    expect(safeNextPath('/checkout')).toBe('/checkout')
    expect(safeNextPath('https://evil.com')).toBe('/')
    expect(safeNextPath('//evil.com')).toBe('/')
  })

  it('null-hash buyer: reset → setPassword → login', async () => {
    installBrowserShims()
    // Берём ETL-пользователя без пароля через reset (devHint при mailConfigured=false)
    const email =
      process.env.NEST_LIVE_CLAIM_EMAIL?.trim() || 'user@example.com'
    const res = await requestPasswordReset(email, 'http://127.0.0.1:3001/login')
    expect(res.mailConfigured === false || res.emailSent || res.devHint).toBeTruthy()

    const hint = res.devHint
    if (!hint) {
      // SMTP настроен и письмо ушло — без доступа к inbox claim не проверить
      console.warn('skip claim: no devHint (SMTP configured)')
      return
    }
    const token = new URL(hint).searchParams.get('token')
    expect(token).toBeTruthy()

    const password = `SmokeClaim${Date.now()}!a`
    const set = await setPassword(token!, password)
    expect(set.email || email).toBeTruthy()

    const login = await getToken(set.email || email, password)
    expect(login.token.length).toBeGreaterThan(20)
  })
})

describe.skipIf(!live)('Nest live: surcharge in shipping quote', () => {
  it('quote cost >= clientEstimate when surcharge/server reprice applies', async () => {
    const { items } = await fetchProductList({ limit: 1 })
    const variantId = items[0]!.variantId!
    const clientEstimate = 100
    const q = await requestShippingQuote({
      lines: [{ variantId, qty: 1 }],
      shippingMethod: 'CDEK',
      clientEstimate,
      shippingAddress: {
        city: 'Москва',
        address: 'ул. Тверская, 1',
        postalCode: '101000',
        pvzCode: 'MSK123',
        comment: '__VSP:carrier=cdek|dropoff=pvz|pvz=MSK123__',
      },
    })
    // free PVZ возможен при пороге — тогда cost=0; иначе Nest ≥ client (max + surcharge)
    if (!q.freePvz) {
      expect(q.cost).toBeGreaterThanOrEqual(clientEstimate)
    } else {
      expect(q.cost).toBe(0)
    }
  })
})

describe.skipIf(!live)('Nest live: webhook auth + checkout→PAID path', () => {
  it('webhook without secret: accepted or 401 depending on env', async () => {
    const res = await fetch(`${API}/orders/yookassa/webhook`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        event: 'payment.waiting_for_capture',
        object: {
          id: 'smoke-missing',
          status: 'waiting_for_capture',
          paid: false,
          amount: { value: '1.00', currency: 'RUB' },
        },
      }),
    })
    // без secret в non-prod обычно 201 ignored; с secret — 401
    expect([200, 201, 401, 403]).toContain(res.status)
  })

  it('webhook with X-Forwarded-For YooKassa IP + optional secret', async () => {
    const secret = process.env.YOOKASSA_WEBHOOK_SECRET?.trim()
    const url = secret
      ? `${API}/orders/yookassa/webhook?secret=${encodeURIComponent(secret)}`
      : `${API}/orders/yookassa/webhook`
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'X-Forwarded-For': '185.71.76.1',
      },
      body: JSON.stringify({
        event: 'payment.succeeded',
        object: {
          id: 'smoke-nonexistent-payment',
          status: 'succeeded',
          paid: true,
          amount: { value: '1.00', currency: 'RUB' },
          metadata: {},
        },
      }),
    })
    // неизвестный payment → 400 (нет заказа) или ignored после getPayment fail
    expect([200, 201, 400, 401, 403, 502]).toContain(res.status)
    if (secret && (res.status === 401 || res.status === 403)) {
      throw new Error(
        `Webhook auth rejected with secret — check TRUST_PROXY / YOOKASSA_WEBHOOK_* (status ${res.status})`,
      )
    }
  })

  it('prepareNestPayment → confirmationToken; checkout-status not PAID until webhook', async () => {
    installBrowserShims()
    const { prepareNestPayment, clearPendingCheckoutOrder } = await import(
      '@/lib/checkout/nestCheckout'
    )
    const { getCheckoutStatus } = await import('@/api/ordersApi')
    const { buildStreetAddress2WithMeta } = await import('@/lib/addressVspMeta')

    const { items } = await fetchProductList({ limit: 1 })
    const c = items[0]!
    const cartItem = {
      id: c.variantId!,
      variantId: c.variantId!,
      quantity: 1,
      size: '',
      product: {
        id: c.variantId!,
        name: c.name,
        slug: c.slug,
        size: '',
        thumbnail: '',
        image: '',
        aromas: [],
        price: c.price,
        group: [],
        variantId: c.variantId!,
      },
    }
    const address = {
      id: 'a',
      firstName: 'Тест',
      lastName: 'Смоук',
      phone: '+79001234567',
      city: 'Москва',
      cityArea: '',
      countryArea: 'Москва',
      companyName: '',
      postalCode: '101000',
      streetAddress1: 'ул. Тверская, 1',
      streetAddress2: buildStreetAddress2WithMeta(
        { carrier: 'cdek', dropoff: 'pvz', cdekPvzId: 'MSK123' },
        '',
      ),
      isDefaultBillingAddress: false,
      isDefaultShippingAddress: true,
      country: { code: 'RU', country: 'Россия' },
    }
    const input = {
      items: [cartItem],
      email: 'smoke-checkout@example.com',
      phone: '+79001234567',
      customerName: 'Тест Смоук',
      address,
      contact: { firstName: 'Тест', lastName: 'Смоук', phone: '+79001234567' },
      promoCode: null,
      shippingEstimate: 300,
      shippingFree: false,
      carrier: 'cdek' as const,
    }

    let prepared
    try {
      prepared = await prepareNestPayment(input)
    } catch (e) {
      const cost = (e as { extra?: { shippingCost?: number } }).extra?.shippingCost
      expect(cost).toBeTypeOf('number')
      prepared = await prepareNestPayment({ ...input, shippingEstimate: cost! })
    }
    expect(prepared.order.id).toBeTruthy()
    expect(prepared.pay.confirmationToken).toBeTruthy()
    expect(prepared.pay.paymentId).toBeTruthy()

    const status = await getCheckoutStatus(
      prepared.order.id,
      prepared.order.payToken,
    )
    // до реального webhook заказ не PAID
    expect(status.paid).not.toBe(true)

    // webhook с фейковым payment id не должен «тихо» пометить PAID
    const wh = await fetch(`${API}/orders/yookassa/webhook`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'X-Forwarded-For': '185.71.76.1',
        ...(process.env.YOOKASSA_WEBHOOK_SECRET
          ? {
              'X-Yookassa-Webhook-Secret': process.env.YOOKASSA_WEBHOOK_SECRET,
            }
          : {}),
      },
      body: JSON.stringify({
        event: 'payment.succeeded',
        object: {
          id: prepared.pay.paymentId,
          status: 'succeeded',
          paid: true,
          metadata: { orderId: prepared.order.id },
        },
      }),
    })
    // getPayment у ЮKassa обычно ещё не succeeded → ignored / 4xx; не должно быть 500
    expect(wh.status).toBeLessThan(500)

    const again = await prepareNestPayment({
      ...input,
      shippingEstimate: prepared.quote.cost,
    })
    expect(again.reusedOrder).toBe(true)
    expect(again.order.id).toBe(prepared.order.id)

    await abandonOrder(prepared.order.id, prepared.order.payToken!)
    clearPendingCheckoutOrder()
  })
})

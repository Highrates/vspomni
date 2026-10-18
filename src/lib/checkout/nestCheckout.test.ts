import { describe, expect, it } from 'vitest'
import { buildNestShippingAddress, carrierToShippingMethod } from '@/lib/checkout/nestCheckout'
import { buildStreetAddress2WithMeta } from '@/lib/addressVspMeta'
import { mapNestPromoToValidation } from '@/graphql/queries/promocode.service'
import { mapNestOrderToApi } from '@/lib/order/api'
import type { AddressInfo } from '@/graphql/types/auth.types'

const baseAddress = (streetAddress2: string): AddressInfo => ({
  id: '1',
  firstName: 'Анна',
  lastName: 'Иванова',
  phone: '+79001234567',
  city: 'Москва',
  cityArea: 'ЦАО',
  countryArea: 'Москва',
  companyName: '',
  postalCode: '101000',
  streetAddress1: 'ул. Тверская, 1',
  streetAddress2,
  isDefaultBillingAddress: false,
  isDefaultShippingAddress: true,
  country: { code: 'RU', country: 'Россия' },
})

describe('buildNestShippingAddress', () => {
  it('maps CDEK PVZ with pvzCode, region, district and meta comment', () => {
    const s2 = buildStreetAddress2WithMeta(
      { carrier: 'cdek', dropoff: 'pvz', cdekPvzId: 'MSK123' },
      'позвонить за час',
    )
    const { shippingAddress, shippingMethod } = buildNestShippingAddress(baseAddress(s2), {
      phone: '+79990000000',
    })
    expect(shippingMethod).toBe('CDEK')
    expect(shippingAddress).toMatchObject({
      city: 'Москва',
      address: 'ул. Тверская, 1',
      region: 'Москва',
      district: 'ЦАО',
      postalCode: '101000',
      pvzCode: 'MSK123',
      phone: '+79990000000',
      recipientName: 'Анна Иванова',
    })
    expect(shippingAddress.comment).toContain('__VSP:carrier=cdek')
    expect(shippingAddress.comment).toContain('|pvz=MSK123')
    expect(shippingAddress.comment).toContain('позвонить за час')
  })

  it('does not send pvzCode for courier delivery', () => {
    const s2 = buildStreetAddress2WithMeta(
      { carrier: 'yandex', dropoff: 'courier', lon: 37.6, lat: 55.7, yandexPvzId: 'x' },
      '',
    )
    const { shippingAddress, shippingMethod } = buildNestShippingAddress(baseAddress(s2), {})
    expect(shippingMethod).toBe('YANDEX')
    expect(shippingAddress.pvzCode).toBeUndefined()
  })

  it('uses Ozon PVZ id', () => {
    const s2 = buildStreetAddress2WithMeta({ carrier: 'ozon', dropoff: 'pvz', ozonPvzId: '777' }, '')
    const { shippingAddress, shippingMethod } = buildNestShippingAddress(baseAddress(s2), {})
    expect(shippingMethod).toBe('OZON')
    expect(shippingAddress.pvzCode).toBe('777')
  })

  it('defaults to CDEK without meta', () => {
    expect(carrierToShippingMethod(null)).toBe('CDEK')
  })
})

describe('mapNestPromoToValidation', () => {
  it('maps PERCENT order-wide promo', () => {
    expect(
      mapNestPromoToValidation(
        { code: 'SALE10', type: 'PERCENT', value: 10, discountAmount: 218, subtotal: 2180, minOrderAmount: null, scope: null },
        'sale10',
      ),
    ).toEqual({
      code: 'SALE10',
      discountType: 'PERCENTAGE',
      discountValueType: 'PERCENTAGE',
      discountValue: 10,
      discountAmount: 218,
      scope: 'ORDER',
      minSpent: null,
    })
  })

  it('maps scoped FIXED promo', () => {
    const r = mapNestPromoToValidation(
      { code: 'X', type: 'FIXED', value: 300, discountAmount: 300, subtotal: 2000, minOrderAmount: 1000, scope: 'CATEGORY' },
      'x',
    )
    expect(r.discountType).toBe('FIXED')
    expect(r.scope).toBe('PRODUCTS')
    expect(r.minSpent).toBe(1000)
  })
})

describe('mapNestOrderToApi', () => {
  it('maps AWAITING_PAYMENT summary (rubles, no ×100)', () => {
    const o = mapNestOrderToApi({
      id: 'o1',
      number: 'VSP-1',
      status: 'AWAITING_PAYMENT',
      total: 2590,
      subtotal: 2180,
      shippingCost: 410,
      discountTotal: 0,
      createdAt: '2026-10-07T12:00:00.000Z',
      tracking: null,
      trackingProvider: null,
      items: [
        { id: 'i1', title: 'Саше', sku: null, qty: 2, unitPrice: 1090, lineTotal: 2180, imageUrl: null, variantName: '1 шт', shadeName: null },
      ],
    })
    expect(o.statusCode).toBe('awaiting_payment')
    expect(o.total.gross.amount).toBe(2590)
    expect(o.lines[0]!.quantity).toBe(2)
    expect(o.chargeStatusDisplay).toBe('Не оплачен')
  })
})

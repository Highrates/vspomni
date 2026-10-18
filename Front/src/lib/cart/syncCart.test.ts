import { describe, expect, it } from 'vitest'
import { applyCartSyncResponse, buildSyncLines } from '@/lib/cart/syncCart'
import type { CartItem } from '@/types/cart'
import type { CartSyncResponse } from '@/api/catalogApi'

const item = (id: string, qty: number, price = 100): CartItem => ({
  id,
  variantId: id,
  quantity: qty,
  size: '50 мл',
  product: {
    id,
    name: `P-${id}`,
    slug: `p-${id}`,
    size: '50 мл',
    thumbnail: '',
    image: '',
    aromas: [],
    price,
    group: [],
    variantId: id,
  },
})

const synced = (
  variantId: string,
  over: Partial<CartSyncResponse['items'][number]> = {},
): CartSyncResponse['items'][number] => ({
  key: variantId,
  productId: 'p',
  variantId,
  shadeId: null,
  shadeName: null,
  slug: 's',
  name: 'n',
  variantName: 'v',
  imageUrl: null,
  price: 100,
  listPrice: 100,
  minQty: 1,
  maxQty: 10,
  qty: 1,
  ...over,
})

describe('buildSyncLines', () => {
  it('merges duplicates and skips lines without variant', () => {
    const lines = buildSyncLines([item('a', 1), item('a', 2), { ...item('b', 1), id: '', variantId: '' }])
    expect(lines).toEqual([{ variantId: 'a', qty: 3 }])
  })
})

describe('applyCartSyncResponse', () => {
  it('removes OOS / missing lines and reports them', () => {
    const out = applyCartSyncResponse([item('a', 1), item('b', 2)], {
      items: [synced('a')],
      removedKeys: ['b'],
      removedLines: [{ key: 'b', reason: 'oos', name: 'Бутылка' }],
    })
    expect(out.items.map((i) => i.id)).toEqual(['a'])
    expect(out.removed).toEqual([{ key: 'b', reason: 'oos', name: 'Бутылка' }])
    expect(out.changed).toBe(true)
  })

  it('updates price/discount and clamps quantity to maxQty', () => {
    const out = applyCartSyncResponse([item('a', 5, 100)], {
      items: [synced('a', { price: 80, listPrice: 100, maxQty: 3 })],
      removedKeys: [],
    })
    const line = out.items[0]!
    expect(line.quantity).toBe(3)
    expect(line.product.price).toBe(80)
    expect(line.product.oldPrice).toBe(100)
    expect(line.product.discountPercent).toBe(20)
    expect(line.product.quantityAvailable).toBe(3)
    expect(out.priceChanged).toBe(true)
    expect(out.qtyChanged).toBe(true)
  })

  it('reports no change when server agrees', () => {
    const out = applyCartSyncResponse([item('a', 2, 100)], {
      items: [synced('a')],
      removedKeys: [],
    })
    expect(out.changed).toBe(false)
  })

  it('raises quantity to minQty', () => {
    const out = applyCartSyncResponse([item('a', 1)], {
      items: [synced('a', { minQty: 2 })],
      removedKeys: [],
    })
    expect(out.items[0]!.quantity).toBe(2)
  })

  it('applies Nest weightGrams / dims to cart product', () => {
    const out = applyCartSyncResponse([item('a', 1)], {
      items: [
        synced('a', {
          weightGrams: 350,
          lengthMm: 120,
          widthMm: 80,
          heightMm: 60,
        }),
      ],
      removedKeys: [],
    })
    expect(out.items[0]!.product.weight).toBe(0.35)
    expect(out.items[0]!.product.length).toBe(120)
    expect(out.items[0]!.product.width).toBe(80)
    expect(out.items[0]!.product.height).toBe(60)
  })
})

describe('describeCartSyncChanges skipped', () => {
  it('сообщает о сетевом skip', async () => {
    const { describeCartSyncChanges } = await import('./syncCart')
    expect(
      describeCartSyncChanges({
        items: [],
        removed: [],
        changed: false,
        priceChanged: false,
        qtyChanged: false,
        skipped: true,
      }),
    ).toMatch(/интернет/i)
  })
})

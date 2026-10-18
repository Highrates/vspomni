import { describe, expect, it } from 'vitest'
import { nextFromSearchParams, safeNextPath } from './safeNextPath'

describe('safeNextPath', () => {
  it('принимает относительные пути', () => {
    expect(safeNextPath('/checkout')).toBe('/checkout')
    expect(safeNextPath('/checkout/success?x=1')).toBe('/checkout/success?x=1')
  })

  it('отклоняет внешние и опасные значения', () => {
    expect(safeNextPath('https://evil.com')).toBe('/')
    expect(safeNextPath('//evil.com')).toBe('/')
    expect(safeNextPath('checkout')).toBe('/')
    expect(safeNextPath('/login')).toBe('/')
    expect(safeNextPath('/login?x=1')).toBe('/')
  })

  it('читает next из searchParams', () => {
    expect(
      nextFromSearchParams({ get: (k) => (k === 'next' ? '/checkout' : null) }),
    ).toBe('/checkout')
  })
})

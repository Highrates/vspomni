import { describe, expect, it } from 'vitest'
import { formatVariantVolumeLabel } from './variantVolumeLabel'

describe('formatVariantVolumeLabel', () => {
  it('предпочитает volumeMl', () => {
    expect(formatVariantVolumeLabel({ name: 'Стандарт', volumeMl: 100 })).toBe(
      '100 мл',
    )
  })

  it('не дублирует, если name уже с мл', () => {
    expect(formatVariantVolumeLabel({ name: '100 мл', volumeMl: 100 })).toBe(
      '100 мл',
    )
  })

  it('fallback на name', () => {
    expect(formatVariantVolumeLabel({ name: 'Набор', volumeMl: null })).toBe(
      'Набор',
    )
  })
})

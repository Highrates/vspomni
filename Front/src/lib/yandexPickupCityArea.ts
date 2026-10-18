import type { YandexPickupPointAddress } from '@/types/yandexDelivery'

/** Район/округ для формы адреса из ответа списка ПВЗ Яндекса */
export function yandexPickupCityArea(addr?: YandexPickupPointAddress): string {
  if (!addr) return ''
  const a = addr as Record<string, unknown>
  const keys = [
    'sub_region',
    'subRegion',
    'district',
    'area',
    'borough',
    'dependent_locality',
  ] as const
  for (const k of keys) {
    const v = a[k]
    if (typeof v === 'string' && v.trim()) return v.trim()
  }
  const full = addr.full_address || ''
  const m = full.match(/(?:,|^)\s*(?:р-н|район|округ)\s*([^,]+)/i)
  if (m?.[1]) return m[1].trim()
  return ''
}

import type { YandexPickupPoint } from '@/types/yandexDelivery'

export type RuAddressHints = {
  city?: string
  region?: string
  addressLine?: string
  postalCode?: string
}

const FEDERAL_DISTRICT_RE = /федеральный\s+округ/i

function norm(s: string | undefined | null): string {
  return (s || '').trim().toLowerCase().replace(/ё/g, 'е')
}

function isFederalDistrict(name: string): boolean {
  return FEDERAL_DISTRICT_RE.test(name)
}

function normalizeSaleorRegionName(region: string): string {
  const r = region.trim()
  const low = norm(r)

  if (isFederalDistrict(r)) return ''

  if (low === 'москва' || low === 'г москва' || low === 'город москва') {
    return 'Москва'
  }
  if (low.includes('санкт-петербург') || low === 'спб') {
    return 'Санкт-Петербург'
  }
  if (low.includes('московская')) return 'Московская область'
  if (low.includes('ленинградская')) return 'Ленинградская область'

  return r.replace(/^(г\.|город)\s*/i, '').trim()
}

/**
 * countryArea в Saleor для РФ — субъект федерации; должен совпадать со справочником.
 * Yandex Geocoder часто отдаёт федеральный округ или «город X» — нормализуем.
 */
export function inferRuCountryAreaFromAddressHints(hints: RuAddressHints): string {
  const city = (hints.city || '').trim()
  const apiRegion = (hints.region || '').trim()
  const full = norm(hints.addressLine)
  const postal = (hints.postalCode || '').replace(/\D/g, '')
  const cityLow = norm(city)

  const inSpbCity =
    full.includes('санкт-петербург') ||
    full.includes('санкт петербург') ||
    full.includes('st. petersburg') ||
    full.includes('saint petersburg') ||
    full.includes('sankt-peterburg') ||
    cityLow.includes('петербург') ||
    cityLow === 'спб' ||
    (postal.length >= 2 && postal.startsWith('19'))
  if (inSpbCity && !full.includes('ленинградская область')) {
    return 'Санкт-Петербург'
  }

  const inMskCity =
    full.includes('москва') ||
    full.includes('moscow') ||
    cityLow.includes('москва') ||
    cityLow.includes('зеленоград')
  if (inMskCity && !full.includes('московская область')) {
    return 'Москва'
  }

  if (apiRegion) {
    return normalizeSaleorRegionName(apiRegion)
  }

  return ''
}

export function inferRuCountryAreaFromYandexPvz(
  pvz: YandexPickupPoint,
  cityHint: string,
): string {
  const addr = pvz.address
  return inferRuCountryAreaFromAddressHints({
    city: cityHint || addr?.locality || addr?.region || '',
    region: addr?.region,
    addressLine: addr?.full_address,
    postalCode: addr?.postal_code,
  })
}

/** Перед сохранением адреса в Saleor для РФ — безопасный countryArea. */
export function sanitizeRuCountryAreaForSaleor(hints: RuAddressHints): string {
  return inferRuCountryAreaFromAddressHints(hints)
}

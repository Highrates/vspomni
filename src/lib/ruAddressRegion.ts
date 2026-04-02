import type { YandexPickupPoint } from '@/types/yandexDelivery'

/**
 * countryArea в Saleor для РФ — субъект; должен совпадать со справочником.
 * locality / full_address у Яндекса бывают на латинице или без слова «Санкт-Петербург».
 */
export function inferRuCountryAreaFromYandexPvz(
  pvz: YandexPickupPoint,
  cityHint: string,
): string {
  const addr = pvz.address
  const locality = (addr?.locality || '').trim()
  const apiRegion = (addr?.region || '').trim()
  const full = (addr?.full_address || '').toLowerCase()
  const postal = (addr?.postal_code || '').replace(/\D/g, '')
  const cityLow = (cityHint || locality).toLowerCase()

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
    return apiRegion.replace(/^(г\.|город)\s*/i, '').trim()
  }

  return ''
}

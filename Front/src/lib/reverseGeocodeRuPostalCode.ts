/**
 * Почтовый индекс по координатам (Яндекс Geocoder).
 * Ozon Seller API часто не отдаёт индекс в адресе ПВЗ.
 */
export async function reverseGeocodeRuPostalCode(
  latitude: number,
  longitude: number,
): Promise<string | undefined> {
  const apiKey = process.env.NEXT_PUBLIC_YANDEX_MAP_API_KEY
  if (!apiKey || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return undefined
  }

  const url = new URL('https://geocode-maps.yandex.ru/1.x/')
  url.searchParams.set('apikey', apiKey)
  url.searchParams.set('geocode', `${longitude},${latitude}`)
  url.searchParams.set('format', 'json')
  url.searchParams.set('results', '1')
  url.searchParams.set('lang', 'ru_RU')

  try {
    const res = await fetch(url.toString(), { cache: 'no-store' })
    if (!res.ok) return undefined
    const data = (await res.json()) as {
      response?: {
        GeoObjectCollection?: {
          featureMember?: Array<{
            GeoObject?: {
              metaDataProperty?: {
                GeocoderMetaData?: {
                  Address?: { postal_code?: string }
                }
              }
            }
          }>
        }
      }
    }
    const postal =
      data.response?.GeoObjectCollection?.featureMember?.[0]?.GeoObject
        ?.metaDataProperty?.GeocoderMetaData?.Address?.postal_code
    const digits = String(postal || '').replace(/\D/g, '')
    return digits.length === 6 ? digits : undefined
  } catch {
    return undefined
  }
}

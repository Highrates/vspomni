/**
 * Служебная строка в начале `streetAddress2`: перевозчик, координаты ПВЗ Яндекса,
 * опционально id пункта Яндекса для расчёта (|pvz=...).
 * Пользовательский комментарий — со второй строки (или пусто).
 */

export type VspAddressMeta = {
  carrier: 'cdek' | 'yandex'
  lon?: number
  lat?: number
  /** id пункта из API Яндекса (pickup-points); для offers/calculate с type=pvz */
  yandexPvzId?: string
}

function parseMetaFirstLine(first: string): VspAddressMeta | null {
  const m = first.match(/^__VSP:carrier=(cdek|yandex)(.*)__$/)
  if (!m) return null
  const carrier = m[1] as 'cdek' | 'yandex'
  const tail = m[2] || ''
  const meta: VspAddressMeta = { carrier }
  if (!tail) return meta
  for (const seg of tail.split('|')) {
    if (!seg) continue
    const eq = seg.indexOf('=')
    if (eq <= 0) continue
    const key = seg.slice(0, eq)
    const val = seg.slice(eq + 1)
    if (key === 'lon') {
      const n = Number(val)
      if (Number.isFinite(n)) meta.lon = n
    } else if (key === 'lat') {
      const n = Number(val)
      if (Number.isFinite(n)) meta.lat = n
    } else if (key === 'pvz' && val) {
      meta.yandexPvzId = val
    }
  }
  return meta
}

export function parseVspAddressMeta(streetAddress2: string): {
  meta: VspAddressMeta | null
  comment: string
} {
  const s = streetAddress2?.trim() ?? ''
  if (!s) return { meta: null, comment: '' }

  const nl = s.indexOf('\n')
  const first = nl === -1 ? s : s.slice(0, nl)
  const rest = nl === -1 ? '' : s.slice(nl + 1).trimEnd()

  const meta = parseMetaFirstLine(first)
  if (!meta) return { meta: null, comment: s }

  return { meta, comment: rest }
}

export function buildStreetAddress2WithMeta(
  meta: VspAddressMeta,
  userComment: string,
): string {
  let line = `__VSP:carrier=${meta.carrier}`
  if (
    meta.lon != null &&
    meta.lat != null &&
    Number.isFinite(meta.lon) &&
    Number.isFinite(meta.lat)
  ) {
    line += `|lon=${meta.lon}|lat=${meta.lat}`
  }
  const pvz = meta.yandexPvzId?.trim()
  if (pvz) {
    line += `|pvz=${pvz}`
  }
  line += `__`
  const c = (userComment || '').trim()
  return c ? `${line}\n${c}` : line
}

/** Для отображения пользователю (профиль, checkout) */
export function displayStreetAddress2Comment(streetAddress2: string | undefined | null): string {
  return parseVspAddressMeta(streetAddress2 || '').comment
}

export function getShippingCarrierFromAddress(
  streetAddress2: string | undefined | null,
): 'cdek' | 'yandex' {
  return parseVspAddressMeta(streetAddress2 || '').meta?.carrier ?? 'cdek'
}

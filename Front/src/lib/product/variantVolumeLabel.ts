/**
 * Подпись варианта для UI: предпочитаем volumeMl («100 мл»), иначе name.
 */
export function formatVariantVolumeLabel(variant: {
  name?: string | null
  volumeMl?: number | null
}): string {
  const name = (variant.name || '').trim()
  const ml =
    variant.volumeMl != null && Number.isFinite(variant.volumeMl) && variant.volumeMl > 0
      ? Math.round(variant.volumeMl)
      : null

  if (ml != null) {
    // name уже вида «100 мл» / «100ml» — не дублируем
    if (/\d+\s*мл\b/i.test(name) || /\d+\s*ml\b/i.test(name)) return name
    if (!name) return `${ml} мл`
    // «Диффузор» + объём → «100 мл»; если name короткий объёмный — ок
    if (/^\d+(\s*[.,]\d+)?$/.test(name)) return `${ml} мл`
    return `${ml} мл`
  }
  return name || '—'
}

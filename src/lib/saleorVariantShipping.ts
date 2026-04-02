/**
 * Вес и габариты из Saleor: `dimensions.*` часто на уровне продукта, вес — у варианта.
 * Сначала читаем ключ у варианта, затем подмешиваем метаданные продукта.
 */

export type SaleorVariantShippingInput = {
  metadata?: { key: string; value: string }[] | null
  weight?: { value: number } | null
}

function metaValue(
  variantMeta: { key: string; value: string }[],
  productMeta: { key: string; value: string }[],
  key: string,
): string | undefined {
  return (
    variantMeta.find((m) => m.key === key)?.value ??
    productMeta.find((m) => m.key === key)?.value
  )
}

function numOrUndef(raw: string | undefined): number | undefined {
  if (raw == null || raw === '') return undefined
  const n = Number(raw)
  return Number.isFinite(n) && n > 0 ? n : undefined
}

export function variantShippingFromSaleorVariant(
  variant: SaleorVariantShippingInput,
  productMetadata?: { key: string; value: string }[] | null,
): {
  weight?: number
  length?: number
  width?: number
  height?: number
} {
  const vm = variant.metadata || []
  const pm = productMetadata || []
  const get = (k: string) => metaValue(vm, pm, k)

  let length = numOrUndef(get('dimensions.length_mm'))
  let width = numOrUndef(get('dimensions.width_mm'))
  let height = numOrUndef(get('dimensions.height_mm'))
  const volumeM3 = numOrUndef(get('dimensions.volume_m3'))

  if ((!length || !width || !height) && volumeM3 && volumeM3 > 0) {
    const sideMm = Math.round(Math.cbrt(volumeM3 * 1e9))
    length = length || sideMm
    width = width || sideMm
    height = height || sideMm
  }

  const weight =
    typeof variant.weight?.value === 'number' && Number.isFinite(variant.weight.value)
      ? variant.weight.value
      : undefined

  return {
    weight,
    length,
    width,
    height,
  }
}

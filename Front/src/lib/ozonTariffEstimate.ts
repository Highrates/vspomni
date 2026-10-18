import { estimateOzonShipmentPackage } from '@/lib/ozonShipmentEstimate'
import type { OzonShipmentLineInput } from '@/types/ozonDelivery'

/** Универсальные тарифы Ozon Логистики до ПВЗ (упрощённая таблица, ₽). */
const PVZ_TARIFF_BY_LITERS: Array<{ maxLiters: number; price: number }> = [
  { maxLiters: 0.4, price: 49 },
  { maxLiters: 1, price: 79 },
  { maxLiters: 2, price: 99 },
  { maxLiters: 3, price: 129 },
  { maxLiters: 5, price: 169 },
  { maxLiters: 10, price: 249 },
  { maxLiters: 20, price: 399 },
  { maxLiters: 35, price: 599 },
  { maxLiters: Infinity, price: 799 },
]

/** Курьер — ориентировочно ×1.8 от ПВЗ. */
const COURIER_MULTIPLIER = 1.8

function calcVolumeLiters(lengthMm: number, widthMm: number, heightMm: number): number {
  return (lengthMm * widthMm * heightMm) / 1_000_000 / 5
}

function billableLiters(
  weightKg: number,
  lengthMm: number,
  widthMm: number,
  heightMm: number,
): number {
  const volumetric = calcVolumeLiters(lengthMm, widthMm, heightMm)
  return Math.max(weightKg, volumetric)
}

function priceFromLiters(liters: number, courier: boolean): number {
  for (const tier of PVZ_TARIFF_BY_LITERS) {
    if (liters <= tier.maxLiters) {
      const base = tier.price
      return courier ? Math.round(base * COURIER_MULTIPLIER) : base
    }
  }
  return courier ? Math.round(799 * COURIER_MULTIPLIER) : 799
}

export function estimateOzonDeliveryRub(params: {
  shipmentLines?: OzonShipmentLineInput[]
  weightG?: number
  courier?: boolean
}): { amount: number; days?: number } {
  let liters = 0

  if (params.shipmentLines?.length) {
    const pkg = estimateOzonShipmentPackage(params.shipmentLines)
    const totalWeightKg = pkg.totalWeightG / 1000
    liters = billableLiters(totalWeightKg, pkg.lengthMm, pkg.widthMm, pkg.heightMm)
  } else if (params.weightG && params.weightG > 0) {
    liters = Math.max(params.weightG / 1000, 0.3)
  } else {
    liters = 0.6
  }

  const amount = priceFromLiters(liters, Boolean(params.courier))
  return { amount, days: params.courier ? 3 : 5 }
}

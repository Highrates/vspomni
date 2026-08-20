import {
  estimateYandexShipmentPackage,
  type YandexShipmentLineInput,
} from '@/lib/yandexShipmentEstimate'
import type { OzonShipmentLineInput } from '@/types/ozonDelivery'

export type { OzonShipmentLineInput }

/** Вес (г) и габариты одного места (мм) для Ozon Rocket API */
export function estimateOzonShipmentPackage(lines: OzonShipmentLineInput[]): {
  totalWeightG: number
  lengthMm: number
  widthMm: number
  heightMm: number
} {
  const yandexLines: YandexShipmentLineInput[] = lines.map((l) => ({
    quantity: l.quantity,
    weightKg: l.weightKg,
    lengthMm: l.lengthMm,
    widthMm: l.widthMm,
    heightMm: l.heightMm,
  }))
  const pkg = estimateYandexShipmentPackage(yandexLines)
  return {
    totalWeightG: pkg.totalWeightG,
    lengthMm: Math.max(10, Math.round(pkg.dxCm * 10)),
    widthMm: Math.max(10, Math.round(pkg.dyCm * 10)),
    heightMm: Math.max(10, Math.round(pkg.dzCm * 10)),
  }
}

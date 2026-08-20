import type {
  OzonCalculateResponse,
  OzonPickupPoint,
  OzonShipmentLineInput,
} from '@/types/ozonDelivery'

const API_BASE = '/api/ozon-delivery'

async function post<T>(body: unknown): Promise<T> {
  const res = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  if (!res.ok) {
    const msg = (data as { error?: string }).error || res.statusText
    throw new Error(msg)
  }
  return data as T
}

export async function listOzonCities(): Promise<string[]> {
  const data = await post<{ cities: string[] }>({ action: 'list-cities' })
  return data.cities || []
}

export async function listOzonPickupPoints(cityName: string): Promise<OzonPickupPoint[]> {
  const data = await post<{ points: OzonPickupPoint[] }>({
    action: 'list-variants',
    cityName,
    deliveryTypes: ['PickPoint', 'Postamat'],
  })
  return data.points || []
}

export async function calculateOzonDelivery(params: {
  deliveryVariantId: string
  weightG: number
  estimatedPrice?: number
  shipmentLines?: OzonShipmentLineInput[]
}): Promise<OzonCalculateResponse> {
  return post<OzonCalculateResponse>({
    action: 'calculate',
    deliveryVariantId: params.deliveryVariantId,
    weightG: params.weightG,
    estimatedPrice: params.estimatedPrice,
    ...(params.shipmentLines?.length
      ? {
          shipment_lines: params.shipmentLines.map((l) => ({
            quantity: l.quantity,
            ...(l.weightKg != null ? { weight_kg: l.weightKg } : {}),
            ...(l.lengthMm != null ? { length_mm: l.lengthMm } : {}),
            ...(l.widthMm != null ? { width_mm: l.widthMm } : {}),
            ...(l.heightMm != null ? { height_mm: l.heightMm } : {}),
          })),
        }
      : {}),
  })
}

export async function calculateOzonDeliveryByAddress(params: {
  address: string
  estimatedPrice?: number
  shipmentLines?: OzonShipmentLineInput[]
}): Promise<OzonCalculateResponse> {
  return post<OzonCalculateResponse>({
    action: 'calculate-by-address',
    address: params.address,
    estimatedPrice: params.estimatedPrice,
    ...(params.shipmentLines?.length
      ? {
          shipment_lines: params.shipmentLines.map((l) => ({
            quantity: l.quantity,
            ...(l.weightKg != null ? { weight_kg: l.weightKg } : {}),
            ...(l.lengthMm != null ? { length_mm: l.lengthMm } : {}),
            ...(l.widthMm != null ? { width_mm: l.widthMm } : {}),
            ...(l.heightMm != null ? { height_mm: l.heightMm } : {}),
          })),
        }
      : {}),
  })
}

export function parseOzonAmount(raw: unknown): number {
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw
  if (typeof raw === 'string') {
    const n = parseFloat(raw.replace(/\s/g, '').replace(',', '.'))
    return Number.isFinite(n) ? n : 0
  }
  return 0
}

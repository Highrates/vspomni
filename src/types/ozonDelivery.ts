export type OzonDeliveryVariantType =
  | 'PickPoint'
  | 'Postamat'
  | 'Courier'
  | 'ExpressCourier'
  | string

export type OzonDeliveryAddress = {
  region?: string
  city?: string
  address?: string
  postalCode?: string
  fullAddress?: string
}

export type OzonPickupPoint = {
  id: string
  name: string
  type: OzonDeliveryVariantType
  address: OzonDeliveryAddress
  workingHours?: string
  coordinates?: { latitude: number; longitude: number }
}

export type OzonCalculateResponse = {
  amount: number
  days?: number
}

export type OzonShipmentLineInput = {
  quantity: number
  weightKg?: number
  lengthMm?: number
  widthMm?: number
  heightMm?: number
}

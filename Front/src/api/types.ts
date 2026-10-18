/**
 * Типы, которые возвращают Nest-адаптеры (authApi / accountApi / ordersApi).
 * Расширяют существующие Saleor-типы Vspomni Front, чтобы UI компилировался без правок.
 */
import type { AddressInfo, MeInfo } from '@/graphql/types/auth.types'

/** Результат login / register/complete. */
export interface AuthTokenResult {
  token: string
  errors: { code: string; message: string; field?: string }[]
}

export interface NestAddressInfo extends AddressInfo {
  apartment?: string
  metadata?: { key: string; value: string }[]
}

export interface NestMeInfo extends Omit<MeInfo, 'addresses'> {
  addresses: NestAddressInfo[]
  orders?: { totalCount: number }
  phone?: string | null
  birthday?: string | null
  marketingConsent?: boolean
}

export type { AddressInfo, MeInfo }

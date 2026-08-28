import type { AddressInfo } from '@/graphql/types/auth.types'
import {
  displayStreetAddress2Comment,
  formatDeliveryAddressSummary,
} from '@/lib/addressVspMeta'

const STORAGE_KEY = 'vspomni_checkout_delivery_address'

export type CheckoutContact = {
  firstName?: string
  lastName?: string
  phone?: string
}

export function persistCheckoutDeliveryAddress(address: AddressInfo): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(address))
  } catch {
    // private mode
  }
}

export function loadPersistedCheckoutDeliveryAddress(): AddressInfo | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as AddressInfo
  } catch {
    return null
  }
}

export function clearPersistedCheckoutDeliveryAddress(): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}

/** Имя/фамилия/телефон из формы checkout поверх адреса профиля. */
export function mergeCheckoutContact(
  address: AddressInfo,
  contact: CheckoutContact,
): AddressInfo {
  return {
    ...address,
    firstName: contact.firstName?.trim() || address.firstName?.trim() || '',
    lastName: contact.lastName?.trim() || address.lastName?.trim() || '',
    phone: contact.phone?.trim() || address.phone?.trim() || '',
  }
}

/**
 * Адрес для Saleor: в streetAddress1 — читаемое описание доставки (ПВЗ/курьер),
 * в streetAddress2 — служебные метаданные + комментарий пользователя.
 */
export function toSaleorDeliveryAddress(address: AddressInfo): Partial<AddressInfo> {
  const summary = formatDeliveryAddressSummary(address)
  const userComment = displayStreetAddress2Comment(address.streetAddress2 || '')
  const metaLine = (address.streetAddress2 || '').split('\n')[0]?.trim() || ''

  let streetAddress2 = metaLine
  if (userComment) {
    streetAddress2 = metaLine ? `${metaLine}\n${userComment}` : userComment
  }

  return {
    ...address,
    streetAddress1: summary || address.streetAddress1,
    streetAddress2,
  }
}

export function resolveCheckoutDeliveryAddress(
  deliveryAddress?: AddressInfo | null,
): AddressInfo | null {
  return deliveryAddress ?? loadPersistedCheckoutDeliveryAddress()
}

/** Контактные данные из формы checkout (имя, телефон). */
export function buildCheckoutContact(input: {
  name?: string
  familyName?: string
  phone?: string
}): CheckoutContact {
  return {
    firstName: input.name?.trim(),
    lastName: input.familyName?.trim(),
    phone: input.phone?.trim(),
  }
}

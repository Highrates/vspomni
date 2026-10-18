/**
 * Адреса покупателя — Nest `/account/addresses` (см. `@/api/accountApi`).
 * Файл оставлен как адаптер под прежние сигнатуры (AddressModal, OrderDelivery, профиль).
 *
 * Ограничения Nest-модели адреса:
 * - нет companyName (в Saleor сюда писали название ПВЗ Яндекса) — поле теряется;
 * - служебная строка `__VSP:carrier=…__` (streetAddress2) хранится в `comment` (≤500 символов);
 * - «default» один (shipping = billing).
 */
import type {
  AddressCreateInput,
  AddressUpdateInput,
  AddressInfo,
} from '@/graphql/types/address.types'
import {
  createAddress as nestCreateAddress,
  updateAddress as nestUpdateAddress,
  deleteAddress as nestDeleteAddress,
  setDefaultAddress as nestSetDefaultAddress,
} from '@/api/accountApi'

export async function createAddress(
  input: AddressCreateInput,
  isDefaultShipping: boolean = false,
): Promise<AddressInfo[]> {
  return nestCreateAddress(input, isDefaultShipping)
}

export async function updateAddress(
  id: string,
  input: AddressUpdateInput,
): Promise<AddressInfo[]> {
  return nestUpdateAddress(id, input)
}

export async function deleteAddress(id: string): Promise<AddressInfo[]> {
  return nestDeleteAddress(id)
}

/** `type` оставлен для совместимости с Saleor (SHIPPING/BILLING) — в Nest один default. */
export async function setDefaultAddress(
  id: string,
  _type?: 'SHIPPING' | 'BILLING',
): Promise<AddressInfo[]> {
  return nestSetDefaultAddress(id)
}

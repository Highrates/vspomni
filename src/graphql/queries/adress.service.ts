import {
  AddressCreateInput,
  AddressUpdateInput,
  AddressCreateResponse,
  AddressUpdateResponse,
  AddressDeleteResponse,
  AddressInfo,
} from '@/graphql/types/address.types'
import { graphqlRequest } from '../client'

export async function createAddress(
  input: AddressCreateInput,
  isDefaultShipping: boolean = false
): Promise<AddressInfo[]> {
  const mutation = `
    mutation CreateAddress(
      $input: AddressInput!
      $type: AddressTypeEnum!
    ) {
      accountAddressCreate(
        input: $input
        type: $type
      ) {
        user {
          addresses {
            city
            cityArea
            companyName
            country {
              code
              country
            }
            countryArea
            firstName
            id
            isDefaultBillingAddress
            isDefaultShippingAddress
            lastName
            phone
            postalCode
            streetAddress1
            streetAddress2
          }
        }
        errors {
          field
          message
          code
        }
      }
    }
  `

  const variables = {
    input: {
      firstName: input.firstName,
      lastName: input.lastName,
      phone: input.phone,
      country: input.country,
      countryArea: input.countryArea,
      city: input.city,
      cityArea: input.cityArea,
      streetAddress1: input.streetAddress1,
      streetAddress2: input.streetAddress2 || '',
      postalCode: input.postalCode,
      companyName: input.companyName,
    },
    type: isDefaultShipping ? 'SHIPPING' : 'BILLING',
  }

  const result = await graphqlRequest<AddressCreateResponse>(mutation, variables)

  const errors = result.accountAddressCreate.errors || []

  if (errors.length > 0) {
    const errorMessages = errors.map((e) => {
      let msg = e.message || ''
      // Переводим стандартные ошибки на русский
      if (msg.includes('required') || msg.includes('обязательное')) {
        return 'Заполните все обязательные поля'
      }
      if (msg.includes('address') && msg.includes('required')) {
        return 'Адрес обязателен для заполнения'
      }
      return msg
    }).join(', ')
    throw new Error(`Ошибка создания адреса: ${errorMessages}`)
  }

  if (!result.accountAddressCreate.user) {
    throw new Error('Ошибка создания адреса: Данные пользователя не получены')
  }

  return result.accountAddressCreate.user.addresses
}

export async function updateAddress(
  id: string,
  input: AddressUpdateInput
): Promise<AddressInfo[]> {
  const mutation = `
    mutation UpdateAddress(
      $id: ID!
      $input: AddressInput!
    ) {
      accountAddressUpdate(
        id: $id
        input: $input
      ) {
        user {
          addresses {
            city
            cityArea
            companyName
            country {
              code
              country
            }
            countryArea
            firstName
            id
            isDefaultBillingAddress
            isDefaultShippingAddress
            lastName
            phone
            postalCode
            streetAddress1
            streetAddress2
          }
        }
        errors {
          field
          message
          code
        }
      }
    }
  `

  const variables = {
    id,
    input,
  }

  const result = await graphqlRequest<AddressUpdateResponse>(mutation, variables)

  const errors = result.accountAddressUpdate.errors || []

  if (errors.length > 0) {
    const errorMessages = errors.map((e) => {
      let msg = e.message || ''
      // Переводим стандартные ошибки на русский
      if (msg.includes('required') || msg.includes('обязательное')) {
        return 'Заполните все обязательные поля'
      }
      if (msg.includes('address') && msg.includes('required')) {
        return 'Адрес обязателен для заполнения'
      }
      return msg
    }).join(', ')
    throw new Error(`Ошибка обновления адреса: ${errorMessages}`)
  }

  if (!result.accountAddressUpdate.user) {
    throw new Error('Ошибка обновления адреса: Данные пользователя не получены')
  }

  return result.accountAddressUpdate.user.addresses
}

export async function deleteAddress(id: string): Promise<AddressInfo[]> {
  const mutation = `
    mutation DeleteAddress($id: ID!) {
      accountAddressDelete(id: $id) {
        user {
          addresses {
            city
            cityArea
            companyName
            country {
              code
              country
            }
            countryArea
            firstName
            id
            isDefaultBillingAddress
            isDefaultShippingAddress
            lastName
            phone
            postalCode
            streetAddress1
            streetAddress2
          }
        }
        errors {
          field
          message
          code
        }
      }
    }
  `

  const variables = { id }

  const result = await graphqlRequest<AddressDeleteResponse>(mutation, variables)

  const errors = result.accountAddressDelete.errors || []

  if (errors.length > 0) {
    const errorMessages = errors.map((e) => {
      let msg = e.message || ''
      // Переводим стандартные ошибки на русский
      if (msg.includes('required') || msg.includes('обязательное')) {
        return 'Заполните все обязательные поля'
      }
      return msg
    }).join(', ')
    throw new Error(`Ошибка удаления адреса: ${errorMessages}`)
  }

  if (!result.accountAddressDelete.user) {
    throw new Error('Ошибка удаления адреса: Данные пользователя не получены')
  }

  return result.accountAddressDelete.user.addresses
}

export async function setDefaultAddress(
  id: string,
  type: 'SHIPPING' | 'BILLING'
): Promise<AddressInfo[]> {
  const mutation = `
    mutation SetDefaultAddress($id: ID!, $type: AddressTypeEnum!) {
      accountSetDefaultAddress(id: $id, type: $type) {
        user {
          addresses {
            city
            cityArea
            companyName
            country {
              code
              country
            }
            countryArea
            firstName
            id
            isDefaultBillingAddress
            isDefaultShippingAddress
            lastName
            phone
            postalCode
            streetAddress1
            streetAddress2
          }
        }
        errors {
          field
          message
          code
        }
      }
    }
  `

  const variables = { id, type }

  interface SetDefaultAddressResponse {
    accountSetDefaultAddress: {
      user: {
        addresses: AddressInfo[]
      } | null
      errors: Array<{
        field?: string
        message: string
        code: string
      }>
    }
  }

  const result = await graphqlRequest<SetDefaultAddressResponse>(mutation, variables)

  const errors = result.accountSetDefaultAddress.errors || []

  if (errors.length > 0) {
    throw new Error(
      `Setting default address failed: ${errors.map((e) => e.message).join(', ')}`
    )
  }

  if (!result.accountSetDefaultAddress.user) {
    throw new Error('Setting default address failed: No user data returned')
  }

  return result.accountSetDefaultAddress.user.addresses
}
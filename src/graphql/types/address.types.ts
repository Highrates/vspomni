export interface MutationError {
  code: string
  field?: string
  message: string
}

export interface AddressInfo {
  cityArea: string
  city: string
  companyName: string
  countryArea: string
  firstName: string
  id: string
  isDefaultBillingAddress: boolean
  isDefaultShippingAddress: boolean
  lastName: string
  phone: string
  postalCode: string
  streetAddress1: string
  streetAddress2: string
  country: {
    code: string
    country: string
  }
}

export interface AddressCreateInput {
  firstName: string
  lastName: string
  phone: string
  country: string
  countryArea: string
  city: string
  cityArea: string
  streetAddress1: string
  streetAddress2?: string
  postalCode: string
  companyName: string
}

export interface AddressUpdateInput {
  firstName?: string
  lastName?: string
  phone?: string
  country?: string
  countryArea?: string
  city?: string
  cityArea?: string
  streetAddress1?: string
  streetAddress2?: string
  postalCode?: string
  companyName?: string
}

export interface AccountAddressCreatePayload {
  user: {
    addresses: AddressInfo[]
  } | null
  errors: MutationError[]
}

export interface AccountAddressUpdatePayload {
  user: {
    addresses: AddressInfo[]
  } | null
  errors: MutationError[]
}

export interface AccountAddressDeletePayload {
  user: {
    addresses: AddressInfo[]
  } | null
  errors: MutationError[]
}

export interface AddressCreateResponse {
  accountAddressCreate: AccountAddressCreatePayload
}

export interface AddressUpdateResponse {
  accountAddressUpdate: AccountAddressUpdatePayload
}

export interface AddressDeleteResponse {
  accountAddressDelete: AccountAddressDeletePayload
}
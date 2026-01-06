
export interface MutationError {
  code: string
  field?: string
  message: string
}

export interface AccountError {
  code: string
  message: string
}

export interface User {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  dateJoined: string
  isActive: boolean
  isConfirmed: boolean
  isStaff: boolean
  externalReference?: string | null
}

export interface AccountRegisterPayload {
  requiresConfirmation: boolean
  errors: MutationError[]
  accountErrors: AccountError[]
  user: User | null
}

export interface SignUpMutationResponse {
  accountRegister: AccountRegisterPayload
}

export interface TokenCreateResponse {
  tokenCreate: tokenCreate
}

export interface tokenCreate {
  csrfToken: string | null
  refreshToken: string | null
  token: string 
  errors: MutationError[]
}

export interface TokenRefreshResponse {
  tokenRefresh: {
    token: string | null
    errors: MutationError[]
  }
}

export interface TokenVerifyResponse {
  tokenVerify: {
    payload: {}
    isValid: boolean
    errors: MutationError[]
  }
}

export interface TokensDeactivateAll {
  tokensDeactivateAll: {
    errors: MutationError[]
  }
}


export interface MeInfo {
  id: string
  email: string
  firstName: string
  isActive: boolean
  isConfirmed: boolean
  lastName: string
  addresses: AddressInfo[]
  giftCards: { totalCount: number }
  avatar: ProfileAvatar | null
}

export interface ProfileAvatar {
  url: string
  alt: string
}

export interface AuthState {
  email: string
  pass: string
  signUp: {
    agreeChecked: boolean
    success: boolean
    loadingStatus: boolean
    error:  null
  }
  signIn: {
    success: boolean
    loadingStatus: boolean
    error:  null
  }
  getMe: {
    loadingStatus: boolean
    error: null
  }
  isAuth: boolean
  token: string | null
  me: MeInfo | null
}

interface ResultSignUp {
  email: string
}

export type ResultType = ResultSignUp | null

export interface SignUpArgs {
  email: string
  pass: string
}

export interface MeInfoRequest {
  me: MeInfo
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

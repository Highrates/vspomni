import { CHANNEL, graphqlRequest, RedirectUrl } from '../client'
import {
  tokenCreate,
  TokenCreateResponse,
  SignUpMutationResponse,
  TokenRefreshResponse,
  TokenVerifyResponse,
  TokensDeactivateAll,
} from '@/graphql/types/auth.types'

import { MeInfoRequest } from '@/graphql/types/auth.types'

export async function signUpService(
  email: string,
  password: string,
  firstName?: string,
  lastName?: string,
  phone?: string
) {
  const mutation = `
   mutation  signUp($email: String!, $password: String!, $firstName: String, $lastName: String){
  accountRegister(input: {
    email: $email, 
    password: $password
    firstName: $firstName
    lastName: $lastName
    redirectUrl: "https://vspomni.store/graphql"
  }) {
    requiresConfirmation
  
    errors {
      field
      message
    }
  }
}
  `

  const variables: any = { email, password }
  if (firstName) variables.firstName = firstName
  if (lastName) variables.lastName = lastName

  const result = await graphqlRequest<SignUpMutationResponse>(
    mutation,
    variables,
  )

  const errors = result.accountRegister.errors || []

  if (errors.length > 0) {
    const errorMessages = errors.map((e: any) => {
      let msg = e.message || ''
      // Переводим стандартные ошибки на русский
      if (msg.includes('too short') || msg.includes('Password is too short')) {
        return 'Пароль слишком короткий. Он должен содержать не менее 8 символов.'
      }
      if (msg.includes('This password is too short')) {
        return 'Пароль слишком короткий. Он должен содержать не менее 8 символов.'
      }
      if (msg.includes('Password is too common')) {
        return 'Пароль слишком простой. Выберите более сложный пароль.'
      }
      if (msg.includes('This password is too common')) {
        return 'Пароль слишком простой. Выберите более сложный пароль.'
      }
      if (msg.includes('Enter a valid email address')) {
        return 'Введите корректный email адрес.'
      }
      if (msg.includes('User with this Email already exists') || msg.includes('already exists') || msg.includes('уже существует')) {
        return 'Пользователь с таким email уже зарегистрирован. Попробуйте войти или восстановить пароль.'
      }
      if (msg.includes('email') && msg.includes('unique') || msg.includes('duplicate')) {
        return 'Пользователь с таким email уже зарегистрирован.'
      }
      return msg
    }).join(', ')
    throw new Error(`Ошибка регистрации: ${errorMessages}`)
  }

  return {
    requiresConfirmation: result.accountRegister.requiresConfirmation,
  }
}

export async function getToken(email: string, password: string) {
  if (!email || !password) {
    throw new Error('Email and password are required')
  }

  const mutation = `
    mutation TokenCreate($email: String!, $password: String!) {
      tokenCreate(
        email: $email,
        password: $password
      ) {
        csrfToken
        refreshToken
        token
        errors {
          field
          message
          code
          addressType
        }
      }
    }
  `

  const variables = { email, password }

  const result = await graphqlRequest<TokenCreateResponse>(mutation, variables)

  const payload: tokenCreate = result.tokenCreate

  if (payload.errors?.length > 0) {
    const errorMessages = payload.errors.map((e) => {
      let msg = e.message || ''
      if (msg.includes('Please, enter valid credentials')) {
        return 'Неверный email или пароль. Пожалуйста, проверьте данные и попробуйте снова.'
      }
      if (msg.includes('Invalid credentials')) {
        return 'Неверный email или пароль.'
      }
      return msg
    }).join(', ')
    throw new Error(errorMessages)
  }

  return payload
}

export async function refreshToken(refreshToken: string) {
  const mutation = `
    mutation RefreshToken($refreshToken: String!) {
      tokenRefresh(refreshToken: $refreshToken) {
        token
        errors {
          field
          message
          code
        }
      }
    }
  `

  const variables = { refreshToken }

  const result = await graphqlRequest<TokenRefreshResponse>(mutation, variables)

  const payload = result.tokenRefresh

  if (payload.errors?.length > 0) {
    throw new Error(
      `RefreshToken failed: ${payload.errors.map((e) => e.message).join(', ')}`,
    )
  }

  return payload
}

export async function verifyToken(token: string) {
  const mutation = `
  mutation VerifyToken($token: String!) {
    tokenVerify(token: $token) {
      payload
      isValid
      errors {
        field
        message
        code
        addressType
      }
    }
  }
`

  const variables = { token }
  const result = await graphqlRequest<TokenVerifyResponse>(mutation, variables)
  const payload = result.tokenVerify
  if (payload.errors?.length > 0) {
    throw new Error(
      `VerifyToken failed: ${payload.errors.map((e) => e.message).join(', ')}`,
    )
  }

  return payload
}

export async function DeactivateTokens() {
  const mutation = `
      mutation DeactivateTokens {
        tokensDeactivateAll {
          errors {
            addressType
              code
              field
              message
          }
        }

      }
  `
  const result = await graphqlRequest<TokensDeactivateAll>(mutation)
  const payload = result.tokensDeactivateAll
  if (payload.errors?.length > 0) {
    throw new Error(
      `DeactivateTokens failed: ${payload.errors.map((e) => e.message).join(', ')}`,
    )
  }

  return payload
}

export async function getMeInfo() {
  const query = `
    query getMe{
        me{
          id
          email
          firstName
          lastName
          isActive
          isConfirmed
          addresses {
            cityArea
            companyName
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
            metadata {
              key
              value
            }
            country {
              code
              country
            }
          }
          giftCards{
            totalCount
          }
          orders{
            totalCount
          }
          avatar{
            url
            alt
          }
        }
      }
  `
  const data = await graphqlRequest<MeInfoRequest>(query)
  return data.me
}
export async function confirmEmailRequest(email?: string) {
  const mutation = `
    mutation SendConfirmationEmail($channel: String!, $redirectUrl: String!) {
      sendConfirmationEmail(
        channel: $channel
        redirectUrl: $redirectUrl
      ) {
        errors {
          field
          message
          code
        }
      }
    }
  `

  const variables = {
    channel: CHANNEL,
    redirectUrl: RedirectUrl,
  }

  const result = await graphqlRequest<{
    sendConfirmationEmail: {
      errors: Array<{ field: string; message: string; code: string }>
    }
  }>(mutation, variables)

  if (result.sendConfirmationEmail.errors?.length > 0) {
    throw new Error(
      result.sendConfirmationEmail.errors.map((e) => e.message).join(', ')
    )
  }

  return result
}

export async function confirmAccount(email: string, token: string) {
  const mutation = `
    mutation ConfirmAccount($email: String!, $token: String!) {
      confirmAccount(email: $email, token: $token) {
        errors {
          field
          message
          code
        }
        user {
          id
          email
          isConfirmed
        }
      }
    }
  `

  const variables = {
    email: email,
    token: token,
  }

  const result = await graphqlRequest<{
    confirmAccount: {
      errors: Array<{ field: string; message: string; code: string }>
      user: {
        id: string
        email: string
        isConfirmed: boolean
      } | null
    }
  }>(mutation, variables)

  if (result.confirmAccount.errors?.length > 0) {
    throw new Error(
      result.confirmAccount.errors.map((e) => e.message).join(', ')
    )
  }

  return result.confirmAccount.user
}

export async function updateAccount(firstName?: string, lastName?: string) {
  const mutation = `
    mutation AccountUpdate($input: AccountInput!) {
      accountUpdate(input: $input) {
        errors {
          field
          message
          code
        }
        user {
          id
          email
          firstName
          lastName
        }
      }
    }
  `

  const input: any = {}
  if (firstName !== undefined) input.firstName = firstName
  if (lastName !== undefined) input.lastName = lastName

  const variables = { input }

  const result = await graphqlRequest<{
    accountUpdate: {
      errors: Array<{ field: string; message: string; code: string }>
      user: {
        id: string
        email: string
        firstName: string | null
        lastName: string | null
      } | null
    }
  }>(mutation, variables)

  if (result.accountUpdate.errors?.length > 0) {
    throw new Error(
      result.accountUpdate.errors.map((e) => e.message).join(', ')
    )
  }

  return result.accountUpdate.user
}

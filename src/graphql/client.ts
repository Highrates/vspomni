import { useAuthStore } from "@/stores/useAuth";
import { getEmailConfirmationRedirectUrl } from "@/lib/siteUrl";

export interface GraphQLError {
  message: string
  locations?: { line: number; column: number }[]
  path?: Array<string | number>
  extensions?: Record<string, unknown>
}

export interface GraphQLResponse<T> {
  data?: T
  errors?: GraphQLError[]
}
export const CHANNEL = 'vspomni-site'
export const RedirectUrl = getEmailConfirmationRedirectUrl()


export interface GraphQLRequestOptions {
  /** Передать токен явно (например из профиля при сохранении) — иначе читается из localStorage */
  token?: string | null
}

export async function graphqlRequest<T>(
  query: string,
  variables: Record<string, unknown> = {},
  options?: GraphQLRequestOptions,
): Promise<T> {
  const endpoint = String(process.env.GRAPHQL_PUBLIC_API_URL || 'https://vspomni.store/graphql/')
  if (!endpoint) throw new Error('GRAPHQL_URL is not defined')

  let rawToken: string | null = null
  if (options?.token !== undefined) {
    rawToken = options.token ?? null
  } else if (typeof window !== 'undefined') {
    try {
      rawToken = localStorage.getItem('token')
    } catch {
      // Safari (в т.ч. приватный режим) может блокировать доступ к localStorage
      rawToken = null
    }
  }
  const token =
    rawToken && rawToken !== 'null' && rawToken !== 'undefined'
      ? rawToken
      : null

  const res = await fetch(endpoint, {
    method: 'POST',
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ query, variables }),
  })

  const json = (await res.json()) as GraphQLResponse<T>

  if (json.errors && json.errors.length > 0) {
    const first = json.errors[0]
    const msg = first.message || ''
    if (
      msg.includes('Signature has expired') ||
      msg.includes('token expired')
    ) {
      try {
        localStorage.removeItem('token')
        localStorage.removeItem('refreshToken')
      } catch { }
      useAuthStore.getState().logout()
      throw new Error('TokenExpired')
    }
    throw new Error(`GraphQL error: ${msg}`)
  }

  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(`HTTP ${res.status}: ${errorText}`)
  }

  if (!json.data) throw new Error('GraphQL response did not contain data')

  return json.data
}

import { useAuthStore } from '@/stores/useAuth'

/** Достаёт email из JWT (Saleor access token). */
export function decodeJwtEmail(token: string): string | null {
  try {
    const parts = token.split('.')
    if (parts.length < 2) return null
    const payload = JSON.parse(
      atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')),
    ) as { email?: string }
    return typeof payload.email === 'string'
      ? payload.email.trim().toLowerCase()
      : null
  } catch {
    return null
  }
}

/**
 * Email аккаунта для привязки заказа — приоритет JWT, затем auth-store.
 * Не использует редактируемый user-store на checkout.
 */
export function getAccountEmail(): string {
  if (typeof window !== 'undefined') {
    try {
      const token = localStorage.getItem('token')
      if (token && token !== 'null' && token !== 'undefined') {
        const fromJwt = decodeJwtEmail(token)
        if (fromJwt) return fromJwt
      }
    } catch {
      // private mode / blocked storage
    }
  }

  const authEmail = useAuthStore.getState().email
  if (authEmail?.trim()) return authEmail.trim().toLowerCase()

  return ''
}

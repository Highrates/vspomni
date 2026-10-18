import { useAuthStore } from '@/stores/useAuth'

/** Достаёт email из JWT (Nest access token) — только когда токен доступен (RSC / DIRECT). */
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
 * Email аккаунта для привязки заказа.
 * JWT в httpOnly cookie — из браузера не читаем; берём auth-store (login/checkAuth).
 */
export function getAccountEmail(): string {
  const authEmail = useAuthStore.getState().email
  if (authEmail?.trim()) return authEmail.trim().toLowerCase()
  return ''
}

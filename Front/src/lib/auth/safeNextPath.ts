/**
 * Безопасный return-path после логина (?next=/checkout).
 * Только относительный путь на этом же сайте; иначе fallback.
 */
export function safeNextPath(
  raw: string | null | undefined,
  fallback = '/',
): string {
  const value = (raw ?? '').trim()
  if (!value) return fallback
  // только path (+ query/hash), без схемы / //evil.com / javascript:
  if (!value.startsWith('/')) return fallback
  if (value.startsWith('//')) return fallback
  if (value.includes('://')) return fallback
  if (/[\x00-\x1f]/.test(value)) return fallback
  // не уводим обратно на login (цикл)
  if (value === '/login' || value.startsWith('/login?')) return fallback
  return value
}

/** Прочитать ?next= из URLSearchParams / строки поиска. */
export function nextFromSearchParams(
  searchParams: { get(name: string): string | null } | null | undefined,
  fallback = '/',
): string {
  return safeNextPath(searchParams?.get('next'), fallback)
}

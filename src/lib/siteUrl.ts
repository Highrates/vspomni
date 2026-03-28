/** Канонический origin сайта для JSON-LD и абсолютных URL */
export function getPublicSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim()
  if (explicit) return explicit.replace(/\/$/, '')

  const vercel = process.env.VERCEL_URL?.trim()
  if (vercel) {
    const host = vercel.replace(/^https?:\/\//, '')
    return `https://${host.replace(/\/$/, '')}`
  }

  return 'https://vspomni.store'
}

export function absoluteUrl(path: string): string {
  const base = getPublicSiteUrl()
  if (!path || path === '/') return base
  const p = path.startsWith('/') ? path : `/${path}`
  return `${base}${p}`
}

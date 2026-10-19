import { timingSafeEqual } from 'crypto'
import { revalidatePath, revalidateTag } from 'next/cache'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function secretsEqual(a: string, b: string): boolean {
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  if (left.length !== right.length) return false
  return timingSafeEqual(left, right)
}

function extractSecret(req: NextRequest): string {
  const header = req.headers.get('x-revalidate-secret')?.trim()
  if (header) return header
  const auth = req.headers.get('authorization')?.trim() || ''
  const m = /^Bearer\s+(.+)$/i.exec(auth)
  return m?.[1]?.trim() || ''
}

type Body = {
  paths?: string[]
  tags?: string[]
}

/**
 * On-demand ISR для витрины. Вызывается из Admin с общим REVALIDATE_SECRET.
 * По умолчанию сбрасывает главную (`/`).
 */
export async function POST(req: NextRequest) {
  const expected = process.env.REVALIDATE_SECRET?.trim()
  if (!expected) {
    return NextResponse.json(
      { error: 'REVALIDATE_SECRET is not configured' },
      { status: 503 },
    )
  }

  const provided = extractSecret(req)
  if (!provided || !secretsEqual(provided, expected)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: Body = {}
  try {
    body = (await req.json()) as Body
  } catch {
    body = {}
  }

  const paths =
    Array.isArray(body.paths) && body.paths.length > 0
      ? body.paths.filter((p) => typeof p === 'string' && p.startsWith('/'))
      : ['/']
  const tags = Array.isArray(body.tags)
    ? body.tags.filter((t) => typeof t === 'string' && t.trim())
    : []

  for (const path of paths) {
    revalidatePath(path)
  }
  for (const tag of tags) {
    // Next.js 16: profile обязателен (`max` = сброс кэша тега сразу).
    revalidateTag(tag, 'max')
  }

  return NextResponse.json({
    revalidated: true,
    paths,
    tags,
    now: Date.now(),
  })
}

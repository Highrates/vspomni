const defaultCatalog = 'https://vspomni-opt.honest-bull-1449.chatgpt.site'

export const dynamic = 'force-dynamic'

export function GET() {
  const ordersUrl = process.env.OPT_ADMIN_URL ||
    new URL('/orders', process.env.OPT_CATALOG_URL || defaultCatalog)
  return Response.redirect(ordersUrl, 307)
}

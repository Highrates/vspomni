const previewCatalog = 'https://vspomni-opt.honest-bull-1449.chatgpt.site/#catalog'

export const dynamic = 'force-dynamic'

export function GET() {
  return Response.redirect(process.env.OPT_CATALOG_URL || previewCatalog, 307)
}

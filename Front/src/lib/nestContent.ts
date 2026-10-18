/**
 * Адаптеры HTML (Nest CMS) → форматы, которые уже понимает Vspomni UI
 * (Editor.js JSON из Saleor: renderEditorJsContent / parseEditorJS).
 */

type EditorBlock =
  | { type: 'paragraph'; data: { text: string } }
  | { type: 'header'; data: { text: string; level: number } }
  | { type: 'list'; data: { style: 'ordered' | 'unordered'; items: string[] } }

export function stripHtml(html: string | null | undefined): string {
  if (!html) return ''
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|li)>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/** Грубая нарезка HTML на блоки Editor.js (p / h1-6 / ul|ol → list). Без DOM — работает в RSC. */
export function htmlToEditorBlocks(html: string | null | undefined): EditorBlock[] {
  const src = (html ?? '').trim()
  if (!src) return []
  const blocks: EditorBlock[] = []

  const re = /<(h[1-6]|ul|ol|p)\b[^>]*>([\s\S]*?)<\/\1>/gi
  let lastIndex = 0
  let m: RegExpExecArray | null

  const pushLoose = (chunk: string) => {
    const text = chunk.trim()
    if (!text) return
    for (const part of text.split(/<br\s*\/?>\s*<br\s*\/?>|\n{2,}/i)) {
      const t = part.trim()
      if (stripHtml(t)) blocks.push({ type: 'paragraph', data: { text: t } })
    }
  }

  while ((m = re.exec(src))) {
    pushLoose(src.slice(lastIndex, m.index))
    lastIndex = re.lastIndex
    const tag = m[1].toLowerCase()
    const inner = m[2]
    if (tag === 'p') {
      if (stripHtml(inner)) blocks.push({ type: 'paragraph', data: { text: inner.trim() } })
    } else if (tag.startsWith('h')) {
      const text = stripHtml(inner)
      if (text) blocks.push({ type: 'header', data: { text, level: Number(tag[1]) } })
    } else {
      const items = [...inner.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)]
        .map((x) => x[1].trim())
        .filter(Boolean)
      if (items.length) {
        blocks.push({
          type: 'list',
          data: { style: tag === 'ol' ? 'ordered' : 'unordered', items },
        })
      }
    }
  }
  pushLoose(src.slice(lastIndex))
  return blocks
}

/** JSON-строка Editor.js (как отдавал Saleor `page.content` / `product.description`). */
export function htmlToEditorJsonString(html: string | null | undefined): string {
  const blocks = htmlToEditorBlocks(html)
  if (!blocks.length) return ''
  return JSON.stringify({ blocks })
}

/**
 * Для `parseEditorJS` (PDP): склеивает `block.data.text` через `<br>` и отдаёт в dangerouslySetInnerHTML,
 * поэтому кладём исходный HTML одним paragraph-блоком, чтобы разметка сохранилась.
 */
export function htmlToRawEditorJsonString(html: string | null | undefined): string {
  const t = (html ?? '').trim()
  if (!t) return ''
  return JSON.stringify({ blocks: [{ type: 'paragraph', data: { text: t } }] })
}

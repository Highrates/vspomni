/**
 * Чинит латинские гомоглифы в тегах ароматов из Saleor
 * (например «cладкий» с latin c → «сладкий»).
 */
export function normalizeAromaLabel(label: string): string {
  if (!label) return label
  return label
    .replace(/\bcладк/giu, 'сладк')
    .replace(/(^|[\s,;])c(?=[\u0400-\u04FF])/gu, '$1с')
}

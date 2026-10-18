/** Извлекает 6-значный почтовый индекс РФ из строки адреса. */
export function extractRuPostalCode(text: string | undefined | null): string | undefined {
  if (!text?.trim()) return undefined
  const m = text.match(/\b(\d{6})\b/)
  return m?.[1]
}

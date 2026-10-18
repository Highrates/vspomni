/** Только цифры из строки с маской */
export function ruPhoneDigits(value: string): string {
  return value.replace(/\D/g, '')
}

/**
 * Нормализация ввода РФ: ведущая 8 → 7; если начинается с 9 (код моб.) — добавляем 7.
 * Не трогаем узбекский код 998.
 */
export function normalizeRuPhoneDigits(digits: string): string {
  if (!digits) return ''
  if (digits.startsWith('998')) return digits.slice(0, 12)

  let d = digits
  if (d[0] === '8') {
    d = '7' + d.slice(1)
  }
  if (d.length > 0 && !d.startsWith('7') && d[0] === '9') {
    d = '7' + d
  }
  if (d.startsWith('7')) {
    return d.slice(0, 11)
  }
  return d.slice(0, 15)
}

/** Маска +7 (XXX) XXX-XX-XX */
export function formatRuPhoneDisplay(digitsAfterNormalize: string): string {
  const d = digitsAfterNormalize
  if (!d) return ''
  if (d.startsWith('998')) {
    const u = d.slice(0, 12)
    if (u.length <= 3) return '+998'
    if (u.length <= 5) return `+998(${u.slice(3)})`
    if (u.length <= 8)
      return `+998(${u.slice(3, 5)}) ${u.slice(5)}`
    if (u.length <= 10)
      return `+998(${u.slice(3, 5)}) ${u.slice(5, 8)}-${u.slice(8)}`
    return `+998(${u.slice(3, 5)}) ${u.slice(5, 8)}-${u.slice(8, 10)}-${u.slice(10, 12)}`
  }

  if (!d.startsWith('7')) {
    return d.length > 0 ? `+${d}` : ''
  }

  const full = d.slice(0, 11)
  const rest = full.slice(1)
  if (rest.length === 0) return '+7'
  if (rest.length <= 3) {
    return `+7 (${rest}${rest.length === 3 ? ')' : ''}`
  }
  const area = rest.slice(0, 3)
  const tail = rest.slice(3)
  if (tail.length <= 3) {
    return `+7 (${area}) ${tail}`
  }
  if (tail.length <= 5) {
    return `+7 (${area}) ${tail.slice(0, 3)}-${tail.slice(3)}`
  }
  return `+7 (${area}) ${tail.slice(0, 3)}-${tail.slice(3, 5)}-${tail.slice(5, 7)}`
}

export function formatPhoneInputValue(rawInput: string): string {
  const digits = ruPhoneDigits(rawInput)
  const normalized = normalizeRuPhoneDigits(digits)
  return formatRuPhoneDisplay(normalized)
}

/** Полный российский номер: 11 цифр, с 7 */
export function isValidRuPhone(formattedOrRaw: string): boolean {
  const d = ruPhoneDigits(formattedOrRaw)
  if (d.startsWith('998')) return d.length === 12
  return d.length === 11 && d.startsWith('7')
}

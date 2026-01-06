import { useState } from 'react'

interface PhoneInputProps {
  value: string
  onChange: (value: string) => void
  error?: string
}

export default function PhoneInput({ value, onChange, error }: PhoneInputProps) {
  const [focused, setFocused] = useState(false)

  const formatPhone = (input: string): string => {
    // Remove all non-digit characters
    const digits = input.replace(/\D/g, '')

    // Detect country code
    if (digits.startsWith('7')) {
      // +7(XXX) XXX XX-XX format
      const formatted = digits.slice(0, 11)
      if (formatted.length <= 1) return '+7'
      if (formatted.length <= 4) return `+7(${formatted.slice(1)})`
      if (formatted.length <= 7)
        return `+7(${formatted.slice(1, 4)}) ${formatted.slice(4)}`
      if (formatted.length <= 9)
        return `+7(${formatted.slice(1, 4)}) ${formatted.slice(4, 7)} ${formatted.slice(7)}`
      return `+7(${formatted.slice(1, 4)}) ${formatted.slice(4, 7)} ${formatted.slice(7, 9)}-${formatted.slice(9, 11)}`
    } else if (digits.startsWith('998')) {
      // +998(XX) XXX-XX-XX format
      const formatted = digits.slice(0, 12)
      if (formatted.length <= 3) return '+998'
      if (formatted.length <= 5) return `+998(${formatted.slice(3)})`
      if (formatted.length <= 8)
        return `+998(${formatted.slice(3, 5)}) ${formatted.slice(5)}`
      if (formatted.length <= 10)
        return `+998(${formatted.slice(3, 5)}) ${formatted.slice(5, 8)}-${formatted.slice(8)}`
      return `+998(${formatted.slice(3, 5)}) ${formatted.slice(5, 8)}-${formatted.slice(8, 10)}-${formatted.slice(10, 12)}`
    }

    // Default: just add + if no country code detected
    return digits.length > 0 ? `+${digits}` : ''
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value
    const formatted = formatPhone(input)
    onChange(formatted)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && (value === '+7' || value === '+998')) {
      onChange('')
    }
  }

  return (
    <div className="flex flex-col">
      <label className="text-sm font-medium mb-2">Телефон </label>
      <input
        type="tel"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder="+7 или +998"
        className={`h-12 px-4 rounded-xl border text-base outline-none transition ${
          error ? 'border-red-500' : 'border-black/10 focus:border-black/30'
        }`}
      />
      {error && <span className="text-red-500 text-sm mt-1">{error}</span>}
      {focused && !error && (
        <span className="text-black/40 text-xs mt-1">
          Формат: +7(XXX) XXX XX-XX или +998(XX) XXX-XX-XX
        </span>
      )}
    </div>
  )
}
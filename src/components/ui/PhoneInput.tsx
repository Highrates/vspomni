import { useState } from 'react'
import {
  formatPhoneInputValue,
  ruPhoneDigits,
} from '@/lib/ruPhone'

export interface PhoneInputProps {
  value: string
  onChange: (value: string) => void
  error?: string
  /** Скрыть label (если подпись снаружи) */
  hideLabel?: boolean
  label?: string
  placeholder?: string
  /** Подсказка под полем при фокусе */
  showFormatHint?: boolean
  inputClassName?: string
  labelClassName?: string
}

export default function PhoneInput({
  value,
  onChange,
  error,
  hideLabel = false,
  label = 'Телефон',
  placeholder = '+7 (900) 000-00-00',
  showFormatHint = true,
  inputClassName,
  labelClassName = 'text-sm font-medium mb-2',
}: PhoneInputProps) {
  const [focused, setFocused] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(formatPhoneInputValue(e.target.value))
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Backspace') return
    const digits = ruPhoneDigits(value)
    if (digits.length <= 1) {
      onChange('')
    }
  }

  const defaultInputClass =
    'h-12 px-4 rounded-xl border text-base outline-none transition w-full'

  return (
    <div className="flex flex-col">
      {!hideLabel && label ? (
        <label className={labelClassName}>{label}</label>
      ) : null}
      <input
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false)
          if (value.trim()) {
            const formatted = formatPhoneInputValue(value)
            if (formatted !== value) onChange(formatted)
          }
        }}
        placeholder={placeholder}
        className={
          inputClassName ??
          `${defaultInputClass} ${
            error ? 'border-red-500' : 'border-black/10 focus:border-black/30'
          }`
        }
      />
      {error && <span className="text-red-500 text-sm mt-1">{error}</span>}
      {showFormatHint && focused && !error && (
        <span className="text-black/40 text-xs mt-1">
          Россия: +7; можно начать с 8 или с кода 9XX
        </span>
      )}
    </div>
  )
}

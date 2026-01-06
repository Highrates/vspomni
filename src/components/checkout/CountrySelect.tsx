import { useState, useRef, useEffect } from 'react'

interface CountrySelectProps {
  value: string
  onChange: (value: string) => void
  error?: string
}

// Только Россия
const COUNTRIES = [
  { code: 'RU', name: 'Россия' },
]

export default function CountrySelect({ value, onChange, error }: CountrySelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)

  const selectedCountry = COUNTRIES.find((c) => c.code === value)

  const filteredCountries = COUNTRIES.filter(
    (country) =>
      country.name.toLowerCase().includes(search.toLowerCase()) ||
      country.code.toLowerCase().includes(search.toLowerCase())
  )

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setSearch('')
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleSelect = (code: string) => {
    onChange(code)
    setIsOpen(false)
    setSearch('')
  }

  return (
    <div className="flex flex-col relative" ref={dropdownRef}>
      <label className="text-sm font-medium mb-2">Страна *</label>
      
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`h-12 px-4 rounded-xl border bg-white text-base text-left outline-none transition flex items-center justify-between ${
          error ? 'border-red-500' : 'border-black/10 focus:border-black/30'
        }`}
      >
        <span className={selectedCountry ? 'text-black' : 'text-black/40'}>
          {selectedCountry ? `${selectedCountry.name} (${selectedCountry.code})` : 'Выберите страну'}
        </span>
        <svg
          className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-black/10 rounded-xl shadow-lg z-50 max-h-[300px] overflow-hidden flex flex-col">
          <div className="p-3 border-b border-black/10">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск страны..."
              className="w-full h-10 px-3 rounded-lg border border-black/10 text-sm outline-none focus:border-black/30"
              autoFocus
            />
          </div>
          
          <div className="overflow-y-auto">
            {filteredCountries.length > 0 ? (
              filteredCountries.map((country) => (
                <button
                  key={country.code}
                  type="button"
                  onClick={() => handleSelect(country.code)}
                  className={`w-full px-4 py-2.5 text-left text-sm hover:bg-black/5 transition ${
                    value === country.code ? 'bg-blue-50 text-blue-600 font-medium' : ''
                  }`}
                >
                  {country.name} ({country.code})
                </button>
              ))
            ) : (
              <div className="px-4 py-8 text-center text-black/40 text-sm">
                Страна не найдена
              </div>
            )}
          </div>
        </div>
      )}

      {error && <span className="text-red-500 text-sm mt-1">{error}</span>}
    </div>
  )
}
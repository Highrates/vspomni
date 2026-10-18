'use client'

import { useState } from 'react'
import { usePromoCode } from '@/lib/checkout/usePromoCode'

export const PromoCodeInput = () => {
  const [expandedByUser, setIsExpanded] = useState<boolean | null>(null)
  const {
    promoCode,
    setPromoCode,
    isLoading,
    error,
    appliedPromoCode,
    appliedText,
    apply,
    remove,
  } = usePromoCode()

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isLoading && promoCode.trim()) {
      e.preventDefault()
      void apply()
    }
  }

  const isExpanded = expandedByUser ?? Boolean(appliedPromoCode || error)

  const appliedBlock = (
    <div className="flex items-center justify-between mt-4 p-3 bg-green-50 border border-green-200 rounded-sm">
      <div>
        <p className="text-sm font-medium text-green-800">
          Промокод применён
        </p>
        <p className="text-xs text-green-600 mt-1">{appliedText}</p>
      </div>
      <button
        className="text-red-600 hover:text-red-800 font-medium text-sm disabled:opacity-50"
        onClick={remove}
        disabled={isLoading}
      >
        Удалить
      </button>
    </div>
  )

  return (
    <div className="gap-2 p-3 sm:p-4 border rounded-lg shadow-md mb-8 mt-8 sm:mt-12.5 min-w-0 overflow-x-clip">
      <div
        className="flex items-start sm:items-center w-full gap-2 justify-between cursor-pointer min-w-0"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <label className="min-w-0 flex-1 text-base sm:text-xl font-semibold text-black leading-snug cursor-pointer">
          Добавить промокод
        </label>
        <button
          type="button"
          className="shrink-0 w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-full transition-colors border border-black/10"
          onClick={(e) => {
            e.stopPropagation()
            setIsExpanded(!isExpanded)
          }}
          aria-label={isExpanded ? 'Свернуть' : 'Развернуть'}
        >
          <span className="text-2xl leading-none">
            {isExpanded ? '−' : '+'}
          </span>
        </button>
      </div>

      {appliedPromoCode && !isExpanded && appliedBlock}

      {isExpanded && (
        <>
          {appliedPromoCode ? (
            appliedBlock
          ) : (
            <div className="flex items-center h-12.5 mt-4">
              <input
                type="text"
                name="promoCode"
                placeholder="Введите код"
                autoComplete="off"
                autoCapitalize="characters"
                className="font-medium border-[0.5px] border-black/8 bg-[#FAFAFA] rounded-sm p-2 w-full h-12.5 mr-2 focus:outline-none focus:border-black/20"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isLoading}
              />
              <button
                className={`${
                  !promoCode.trim() || isLoading
                    ? 'bg-[#A3A3A3] cursor-not-allowed'
                    : 'bg-black hover:bg-gray-800'
                } text-white p-2 rounded-sm w-12.5 h-12.5 flex items-center justify-center`}
                disabled={!promoCode.trim() || isLoading}
                onClick={() => void apply()}
              >
                {isLoading ? <span className="animate-spin">⟳</span> : '✓'}
              </button>
            </div>
          )}

          {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
        </>
      )}
    </div>
  )
}

'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useCartStore } from '@/stores/useCart'
import { validatePromoCode } from '@/graphql/queries/promocode.service'

export const CartPromoCode = () => {
  const [promoCode, setPromoCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isExpanded, setIsExpanded] = useState(false)
  const { appliedPromoCode, applyPromoCode, removePromoCode, discount } = useCartStore()

  const handleApplyPromoCode = async () => {
    if (!promoCode.trim()) {
      setError('Введите промокод')
      return
    }

    if (appliedPromoCode) {
      setError('Промокод уже применен. Сначала удалите текущий промокод.')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      console.log('Attempting to validate promo code:', promoCode)
      const voucher = await validatePromoCode(promoCode)
      
      if (!voucher) {
        setError('Промокод не найден. Проверьте правильность ввода.')
        setIsLoading(false)
        return
      }

      console.log('Promo code validated successfully:', voucher)
      applyPromoCode(voucher.code, voucher.discountPercent, voucher.discountAmount)
      setPromoCode('')
      setError(null)
    } catch (err) {
      console.error('Error applying promo code:', err)
      const errorMessage = err instanceof Error ? err.message : 'Не удалось применить промокод'
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    } 
  }

  const handleRemovePromoCode = () => {
    removePromoCode()
    setError(null)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isLoading && promoCode.trim()) {
      e.preventDefault()
      handleApplyPromoCode()
    }
  }

  return (
    <div className="relative">
      <div 
        className="flex py-3 max-sm:px-3 px-4 border justify-between items-center rounded-full cursor-pointer hover:bg-neutral-50 transition"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h2 className="font-semibold flex-1">
          Добавить промокод или сертификат
        </h2>
        <button
          onClick={(e) => {
            e.stopPropagation()
            setIsExpanded(!isExpanded)
          }}
          className="ml-2"
          aria-label={isExpanded ? "Свернуть" : "Развернуть"}
        >
          <Image 
            src="/plus.svg" 
            alt="arrow" 
            width={30} 
            height={30}
            className={`transition-transform ${isExpanded ? 'rotate-45' : ''}`}
          />
        </button>
      </div>

      {isExpanded && (
        <div className="mt-2 bg-white border rounded-lg shadow-lg p-4 z-10">
          {appliedPromoCode ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-800">
                  Промокод применён
                </p>
                <p className="text-xs text-green-600 mt-1">
                  {appliedPromoCode} - {discount > 0 ? `${discount}% скидка` : 'скидка применена'}
                </p>
              </div>
              <button
                className="text-red-600 hover:text-red-800 font-medium text-sm disabled:opacity-50"
                onClick={handleRemovePromoCode}
                disabled={isLoading}
              >
                Удалить
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <input
                type="text"
                name="promoCode"
                placeholder="Введите код"
                className="font-medium border-[0.5px] border-black/8 bg-[#FAFAFA] rounded-sm p-2 flex-1 h-10 focus:outline-none focus:border-black/20"
                value={promoCode}
                onChange={(e) => {
                  setPromoCode(e.target.value)
                  setError(null)
                }}
                onKeyDown={handleKeyDown}
                disabled={isLoading}
              />
              <button
                className={`${
                  !promoCode.trim() || isLoading
                    ? 'bg-[#A3A3A3] cursor-not-allowed'
                    : 'bg-black hover:bg-gray-800'
                } text-white p-2 rounded-sm w-10 h-10 flex items-center justify-center transition-colors disabled:opacity-50`}
                disabled={!promoCode.trim() || isLoading}
                onClick={handleApplyPromoCode}
              >
                {isLoading ? (
                  <span className="animate-spin">⟳</span>
                ) : (
                  '✓'
                )}
              </button>
            </div>
          )}

          {error && (
            <p className="text-red-600 text-sm mt-2">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  )
}


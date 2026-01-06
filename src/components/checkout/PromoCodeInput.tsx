'use client'

import { useState, useEffect } from 'react'
import { useCartStore } from '@/stores/useCart'
import { validatePromoCode } from '@/graphql/queries/promocode.service'

export const PromoCodeInput = ({ checkoutId }: { checkoutId: string }) => {
  const [promoCode, setPromoCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isExpanded, setIsExpanded] = useState(false)
  const {
    appliedPromoCode,
    discount,
    discountAmount,
    discountType,
    applyPromoCode,
    removePromoCode,
  } = useCartStore()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPromoCode(e.target.value)
    setError(null)
  }

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
      const voucher = await validatePromoCode(promoCode, checkoutId)

      if (!voucher) {
        setError('Промокод не найден. Проверьте правильность ввода.')
        setIsLoading(false)
        return
      }

      applyPromoCode(
        voucher.code,
        voucher.discountPercent,
        voucher.discountAmount,
        voucher.discountType,
      )
      setPromoCode('')
      setError(null)
    } catch (err) {
      console.error('Error applying promo code:', err)
      setError(
        err instanceof Error ? err.message : 'Не удалось применить промокод',
      )
    } finally {
      setIsLoading(false)
    }
  }

  const handleRemovePromoCode = () => {
    removePromoCode()
    setError(null)
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleApplyPromoCode()
    }
  }

  const renderAppliedText = () => {
    if (!appliedPromoCode) return null

    // Для FIXED показываем сумму в рублях, для процентного — %
    if (discountType === 'FIXED' && typeof discountAmount === 'number' && discountAmount > 0) {
      return `${appliedPromoCode} - вы получили скидку ${discountAmount} ₽`
    }

    return `${appliedPromoCode} - вы получили скидку ${discount}%`
  }

  useEffect(() => {
    if (appliedPromoCode && !isExpanded) {
      setIsExpanded(true)
    }
  }, [appliedPromoCode, isExpanded])

  return (
    <div className="gap-2 p-4 border rounded-lg shadow-md mb-8 mt-12.5">
      <div
        className="flex items-center w-full justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <label className="text-xl font-semibold text-black block mb-1 cursor-pointer">
          Добавить промокод или сертификат
        </label>
        <button
          className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-full transition-colors border border-black/10"
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

      {appliedPromoCode && !isExpanded && (
        <div className="flex items-center justify-between mt-4 p-3 bg-green-50 border border-green-200 rounded-sm">
          <div>
            <p className="text-sm font-medium text-green-800">
              Промокод применён
            </p>
            <p className="text-xs text-green-600 mt-1">
              {renderAppliedText()}
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
      )}

      {isExpanded && (
        <>
          {appliedPromoCode ? (
            <div className="flex items-center justify-between mt-4 p-3 bg-green-50 border border-green-200 rounded-sm">
              <div>
                <p className="text-sm font-medium text-green-800">
                  Промокод применён
                </p>
                <p className="text-xs text-green-600 mt-1">
                  {renderAppliedText()}
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
            <div className="flex items-center h-12.5 mt-4">
              <input
                type="text"
                name="promoCode"
                placeholder="Введите код"
                className="font-medium border-[0.5px] border-black/8 bg-[#FAFAFA] rounded-sm p-2 w-full h-12.5 mr-2 focus:outline-none focus:border-black/20"
                value={promoCode}
                onChange={handleChange}
                onKeyPress={handleKeyPress}
                disabled={isLoading}
              />
              <button
                className={`${
                  !promoCode.trim() || isLoading
                    ? 'bg-[#A3A3A3] cursor-not-allowed'
                    : 'bg-black hover:bg-gray-800'
                } text-white p-2 rounded-sm w-12.5 h-12.5 flex items-center justify-center`}
                disabled={!promoCode.trim() || isLoading}
                onClick={handleApplyPromoCode}
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

'use client'

import { useEffect } from 'react'
import { toast } from 'react-toastify'
import { describeCartSyncChanges, syncCartWithNest } from '@/lib/cart/syncCart'

/**
 * Подтягивает живые цены/наличие из Nest (`POST /catalog/cart/sync`) при включении
 * (открытие корзины / страница корзины / checkout).
 * Сеть → toast (skipped); изменения цен/наличия → info toast.
 */
export function useCartNestSync(enabled: boolean = true) {
  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    void syncCartWithNest().then((outcome) => {
      if (cancelled) return
      const message = describeCartSyncChanges(outcome)
      if (!message) return
      if (outcome.skipped) toast.warn(message)
      else toast.info(message)
    })
    return () => {
      cancelled = true
    }
  }, [enabled])
}

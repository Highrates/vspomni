import { useEffect, useState } from 'react'

export function useIsClient() {
  const [isClient, setClient] = useState(false)
  useEffect(() => setClient(true), [])
  return isClient
}

export function useMobile(breakpoint: number = 640) {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < breakpoint)
    }

    checkMobile()

    window.addEventListener('resize', checkMobile)

    return () => window.removeEventListener('resize', checkMobile)
  }, [breakpoint])

  return isMobile
}
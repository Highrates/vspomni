type OrderTrackingProps = {
  trackingNumber: string
  className?: string
}

export function isOrderTrackingUrl(trackingNumber: string): boolean {
  return /^https?:\/\//i.test(trackingNumber.trim())
}

export function OrderTrackingInfo({ trackingNumber, className = '' }: OrderTrackingProps) {
  const value = trackingNumber.trim()
  if (!value) return null

  if (isOrderTrackingUrl(value)) {
    return (
      <a
        href={value}
        target="_blank"
        rel="noopener noreferrer"
        className={`inline-flex items-center text-sm font-medium text-[#2688EB] hover:underline underline-offset-2 ${className}`}
      >
        Отследить посылку
      </a>
    )
  }

  return (
    <p className={`text-sm text-black/70 ${className}`}>
      Трек-номер: <span className="font-medium text-black">{value}</span>
    </p>
  )
}

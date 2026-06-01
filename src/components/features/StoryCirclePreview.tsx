'use client'

import { useEffect, useRef, useState } from 'react'

const thumbClass =
  'w-full h-full object-cover rounded-full pointer-events-none'

type Props = {
  imageUrl?: string | null
  videoUrl?: string | null
  alt: string
}

/**
 * Превью в кружке: img для обложки/фото; для одного MP4 — кадр из видео (Safari не рисует <video> без poster).
 */
export default function StoryCirclePreview({ imageUrl, videoUrl, alt }: Props) {
  const [videoThumb, setVideoThumb] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (imageUrl || !videoUrl) {
      setVideoThumb(null)
      return
    }

    const video = videoRef.current
    if (!video) return

    let cancelled = false

    const captureFrame = () => {
      if (cancelled || video.videoWidth === 0) return
      try {
        const canvas = document.createElement('canvas')
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        const ctx = canvas.getContext('2d')
        if (!ctx) return
        ctx.drawImage(video, 0, 0)
        setVideoThumb(canvas.toDataURL('image/jpeg', 0.82))
      } catch {
        // CORS / canvas — остаётся fallback <video>
      }
    }

    const onLoadedData = () => {
      const t = Number.isFinite(video.duration)
        ? Math.min(0.15, video.duration * 0.05)
        : 0.1
      video.currentTime = t
    }

    video.addEventListener('loadeddata', onLoadedData)
    video.addEventListener('seeked', captureFrame, { once: true })

    if (video.readyState >= 2) {
      onLoadedData()
    }

    return () => {
      cancelled = true
      video.removeEventListener('loadeddata', onLoadedData)
      video.removeEventListener('seeked', captureFrame)
    }
  }, [imageUrl, videoUrl])

  if (imageUrl) {
    return <img src={imageUrl} alt={alt} className={thumbClass} />
  }

  if (!videoUrl) {
    return (
      <img
        src="/images/image_faq_3.png"
        alt={alt}
        className={thumbClass}
      />
    )
  }

  if (videoThumb) {
    return <img src={videoThumb} alt={alt} className={thumbClass} />
  }

  return (
    <video
      ref={videoRef}
      src={videoUrl}
      muted
      playsInline
      preload="auto"
      className={thumbClass}
      aria-hidden
    />
  )
}

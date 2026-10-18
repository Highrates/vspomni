'use client'

import { useEffect, useRef, useState } from 'react'

const thumbClass =
  'w-full h-full object-cover rounded-full pointer-events-none'

type Props = {
  imageUrl?: string | null
  videoUrl?: string | null
  alt: string
}

/** iOS/Safari часто показывает пустой кадр без media fragment */
function videoSrcWithFrame(url: string): string {
  if (!url) return url
  if (url.includes('#t=')) return url
  const base = url.split('#')[0]
  return `${base}#t=0.1`
}

/**
 * Превью в кружке: img для обложки/фото; для MP4 — кадр (Safari без poster часто пустой).
 */
export default function StoryCirclePreview({ imageUrl, videoUrl, alt }: Props) {
  const [videoThumb, setVideoThumb] = useState<string | null>(null)
  const [videoFailed, setVideoFailed] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    setVideoThumb(null)
    setVideoFailed(false)

    if (imageUrl || !videoUrl) return

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
        const data = canvas.toDataURL('image/jpeg', 0.82)
        if (data && data.length > 100) setVideoThumb(data)
      } catch {
        // CORS — оставляем <video> с #t=
      }
    }

    const onLoadedData = () => {
      try {
        const t = Number.isFinite(video.duration)
          ? Math.min(0.2, Math.max(0.05, video.duration * 0.05))
          : 0.1
        if (video.currentTime < 0.05) video.currentTime = t
        else captureFrame()
      } catch {
        captureFrame()
      }
    }

    const onError = () => {
      if (!cancelled) setVideoFailed(true)
    }

    video.addEventListener('loadeddata', onLoadedData)
    video.addEventListener('seeked', captureFrame)
    video.addEventListener('error', onError)

    // iOS: иногда metadata уже есть
    if (video.readyState >= 2) onLoadedData()
    else {
      void video.load()
    }

    return () => {
      cancelled = true
      video.removeEventListener('loadeddata', onLoadedData)
      video.removeEventListener('seeked', captureFrame)
      video.removeEventListener('error', onError)
    }
  }, [imageUrl, videoUrl])

  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={alt}
        className={thumbClass}
        loading="eager"
        decoding="async"
        onError={(e) => {
          const el = e.currentTarget
          el.style.display = 'none'
        }}
      />
    )
  }

  if (!videoUrl || videoFailed) {
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
      src={videoSrcWithFrame(videoUrl)}
      muted
      playsInline
      preload="auto"
      autoPlay={false}
      className={thumbClass}
      aria-hidden
    />
  )
}

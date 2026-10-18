'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { StoryMediaType } from '@/lib/storyMedia'

export interface StorySlide {
  url: string
  type: StoryMediaType
}

export interface StoryGroup {
  id: string
  title: string
  stories: StorySlide[]
}

const IMAGE_DURATION_MS = 4000

export default function StoryViewer({
  groups,
  currentGroupIndex,
  initialStoryIndex = 0,
  onClose,
  onGoToGroup,
}: {
  groups: StoryGroup[]
  currentGroupIndex: number
  initialStoryIndex?: number
  onClose: () => void
  onGoToGroup: (groupIndex: number) => void
}) {
  const group = groups[currentGroupIndex]
  const [index, setIndex] = useState(initialStoryIndex)
  const [progress, setProgress] = useState(0)
  const [direction, setDirection] = useState<'next' | 'prev' | null>(null)
  const [isMuted, setIsMuted] = useState(false)
  const touchStart = useRef<{ x: number; y: number } | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)

  const currentSlide = group?.stories[index]

  useEffect(() => {
    setIndex(initialStoryIndex)
    setProgress(0)
    setDirection(null)
    setIsMuted(false)
  }, [group?.id, currentGroupIndex, initialStoryIndex])

  const goToNextGroup = useCallback(() => {
    const nextIndex = currentGroupIndex + 1
    if (nextIndex >= groups.length) {
      onClose()
    } else {
      onGoToGroup(nextIndex)
    }
  }, [currentGroupIndex, groups.length, onClose, onGoToGroup])

  const goToPrevGroup = useCallback(() => {
    const prevIndex = currentGroupIndex - 1
    if (prevIndex < 0) {
      onClose()
    } else {
      onGoToGroup(prevIndex)
    }
  }, [currentGroupIndex, onClose, onGoToGroup])

  const handleNext = useCallback(() => {
    if (!group) return
    if (index < group.stories.length - 1) {
      setDirection('next')
      setIndex((prev) => prev + 1)
    } else {
      goToNextGroup()
    }
  }, [group, index, goToNextGroup])

  const playCurrentVideo = useCallback(async () => {
    const video = videoRef.current
    if (!video) return
    video.muted = isMuted
    video.volume = isMuted ? 0 : 1
    try {
      await video.play()
    } catch {
      if (!isMuted) {
        video.muted = true
        setIsMuted(true)
        try {
          await video.play()
        } catch {
          // пользователь включит звук кнопкой
        }
      }
    }
  }, [isMuted])

  // Авто-переключение для фото (4 с)
  useEffect(() => {
    if (!group || currentSlide?.type === 'video') return
    setProgress(0)
    const start = Date.now()
    const timer = setInterval(() => {
      const elapsed = (Date.now() - start) / IMAGE_DURATION_MS
      setProgress(Math.min(elapsed * 100, 100))
      if (elapsed >= 1) {
        handleNext()
      }
    }, 50)
    return () => clearInterval(timer)
  }, [group?.id, index, handleNext, currentSlide?.type])

  // Прогресс и переход для видео (со звуком)
  useEffect(() => {
    if (!group || currentSlide?.type !== 'video') return
    const video = videoRef.current
    if (!video) return

    setProgress(0)
    video.currentTime = 0

    const onTimeUpdate = () => {
      if (!video.duration || Number.isNaN(video.duration)) return
      setProgress((video.currentTime / video.duration) * 100)
    }

    const onEnded = () => {
      handleNext()
    }

    video.addEventListener('timeupdate', onTimeUpdate)
    video.addEventListener('ended', onEnded)
    void playCurrentVideo()

    return () => {
      video.removeEventListener('timeupdate', onTimeUpdate)
      video.removeEventListener('ended', onEnded)
      video.pause()
    }
  }, [
    group?.id,
    index,
    handleNext,
    currentSlide?.type,
    currentSlide?.url,
    playCurrentVideo,
  ])

  useEffect(() => {
    if (currentSlide?.type === 'video') {
      void playCurrentVideo()
    }
  }, [isMuted, currentSlide?.type, playCurrentVideo])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const handlePrev = useCallback(() => {
    if (!group) return
    if (index > 0) {
      setDirection('prev')
      setIndex((prev) => prev - 1)
    } else {
      goToPrevGroup()
    }
  }, [group, index, goToPrevGroup])

  const toggleMute = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      setIsMuted((m) => !m)
    },
    [],
  )

  const minSwipe = 60
  const onTouchStart = (e: React.TouchEvent) => {
    touchStart.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    }
  }
  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart.current) return
    const dx = e.changedTouches[0].clientX - touchStart.current.x
    const dy = e.changedTouches[0].clientY - touchStart.current.y
    touchStart.current = null

    // Свайп вниз — закрыть (моб)
    if (dy > minSwipe && Math.abs(dy) > Math.abs(dx)) {
      onClose()
      return
    }
    if (Math.abs(dx) < minSwipe) return
    if (dx < -minSwipe) goToNextGroup()
    else if (dx > minSwipe) handlePrev()
  }

  const handleDragEnd = useCallback(
    (
      _: unknown,
      info: {
        offset: { x: number; y: number }
        velocity: { x: number; y: number }
      },
    ) => {
      const threshold = 40
      const { offset, velocity } = info
      // Свайп / флик вниз — закрыть (приоритет над горизонтальным)
      const isVertical =
        Math.abs(offset.y) > Math.abs(offset.x) ||
        Math.abs(velocity.y) > Math.abs(velocity.x)
      if (isVertical && (offset.y > 80 || velocity.y > 500)) {
        onClose()
        return
      }
      if (offset.x < -threshold || velocity.x < -150) goToNextGroup()
      else if (offset.x > threshold || velocity.x > 150) handlePrev()
    },
    [goToNextGroup, handlePrev, onClose],
  )

  if (!group || group.stories.length === 0) return null

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[999] flex items-center justify-center bg-black/90"
        style={{
          height: '100dvh',
          minHeight: '-webkit-fill-available',
          touchAction: 'none',
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div className="absolute top-6 left-1/2 -translate-x-1/2 w-[60%] flex gap-2">
          {group.stories.map((_, i) => (
            <div
              key={i}
              className="flex-1 h-[3px] bg-white/20 rounded-full overflow-hidden"
            >
              {i === index && (
                <motion.div
                  className="h-full bg-white"
                  style={{ width: `${progress}%` }}
                  transition={{ ease: 'linear', duration: 0.05 }}
                />
              )}
              {i < index && <div className="h-full bg-white w-full" />}
            </div>
          ))}
        </div>

        {currentSlide?.type === 'video' ? (
          <motion.video
            key={`${index}-${currentSlide.url}`}
            ref={videoRef}
            src={currentSlide.url}
            className="max-h-[90vh] max-w-[90vw] rounded-2xl object-contain select-none touch-none"
            playsInline
            preload="auto"
            muted={isMuted}
            initial={{
              opacity: 0,
              x: direction === 'next' ? 80 : direction === 'prev' ? -80 : 0,
            }}
            animate={{ opacity: 1, x: 0 }}
            exit={{
              opacity: 0,
              x: direction === 'next' ? -80 : direction === 'prev' ? 80 : 0,
            }}
            transition={{ duration: 0.3 }}
            drag
            dragConstraints={{ left: -120, right: 120, top: 0, bottom: 220 }}
            dragElastic={0.25}
            onDragEnd={handleDragEnd}
          />
        ) : (
          <motion.img
            key={`${index}-${currentSlide?.url}`}
            src={currentSlide?.url}
            alt={`story-${index}`}
            className="max-h-[90vh] max-w-[90vw] rounded-2xl object-contain select-none touch-none"
            initial={{
              opacity: 0,
              x: direction === 'next' ? 80 : direction === 'prev' ? -80 : 0,
            }}
            animate={{ opacity: 1, x: 0 }}
            exit={{
              opacity: 0,
              x: direction === 'next' ? -80 : direction === 'prev' ? 80 : 0,
            }}
            transition={{ duration: 0.3 }}
            drag
            dragConstraints={{ left: -120, right: 120, top: 0, bottom: 220 }}
            dragElastic={0.25}
            onDragEnd={handleDragEnd}
          />
        )}

        {currentSlide?.type === 'video' && (
          <button
            type="button"
            onClick={toggleMute}
            className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 rounded-full bg-black/50 px-4 py-2 text-sm text-white backdrop-blur-sm hover:bg-black/70 transition"
            aria-label={isMuted ? 'Включить звук' : 'Выключить звук'}
          >
            {isMuted ? '🔇 Включить звук' : '🔊 Звук вкл.'}
          </button>
        )}

        <div
          className="absolute left-0 top-0 w-1/2 h-full cursor-pointer"
          onClick={handlePrev}
        />
        <div
          className="absolute right-0 top-0 w-1/2 h-full cursor-pointer"
          onClick={handleNext}
        />

        <button
          type="button"
          onClick={onClose}
          aria-label="Закрыть"
          className="absolute top-5 right-5 sm:top-6 sm:right-6 z-20 flex h-11 w-11 items-center justify-center rounded-full text-white text-3xl font-light leading-none hover:bg-white/10 transition"
        >
          ✕
        </button>
      </motion.div>
    </AnimatePresence>
  )
}

'use client'

import { useState, useEffect } from 'react'
import StoryViewer, { type StoryGroup } from './StoryViewer'
import StoryCirclePreview from './StoryCirclePreview'
import { getAllStories, StoryNode } from '@/graphql/queries/stories.service'

const MAX_VISIBLE = 5

function getCirclePreviewSources(story: StoryNode) {
  const imageUrl =
    story.coverUrl ||
    story.image ||
    story.items.find((item) => item.type === 'image')?.url ||
    null

  const videoUrl =
    !imageUrl && story.items[0]?.type === 'video'
      ? story.items[0].url
      : null

  return { imageUrl, videoUrl }
}

export default function StoryBlock() {
  const [activeGroupIndex, setActiveGroupIndex] = useState<number | null>(null)
  const [initialStoryIndex, setInitialStoryIndex] = useState(0)
  const [stories, setStories] = useState<StoryNode[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStories = async () => {
      try {
        const data = await getAllStories()
        setStories(data)
      } catch (error) {
        console.error('Failed to fetch stories:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchStories()
  }, [])

  if (loading) {
    return (
      <section className="mt-4 sm:mt-5 md:mt-6 lg:mt-8 mb-4 sm:mb-5 md:mb-6 px-4 sm:px-6 md:px-8">
        <div className="w-full flex justify-center">
          <div className="flex gap-3 sm:gap-[14px] md:gap-4 lg:gap-[18px]">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <div className="w-[70px] h-[70px] sm:w-[80px] sm:h-[80px] md:w-[88px] md:h-[88px] lg:w-[96px] lg:h-[96px] rounded-full bg-neutral-200 animate-pulse" />
                <div className="w-[60px] h-3 rounded-full bg-neutral-200 animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </section>
    )
  }

  if (stories.length === 0) {
    return null
  }

  const storyGroups: StoryGroup[] = stories
    .filter(
      (story) => story.isPublished && story.items && story.items.length > 0,
    )
    .sort((a, b) => a.order - b.order)
    .slice(0, MAX_VISIBLE)
    .map((story) => ({
      id: story.id,
      title: story.title,
      stories: story.items
        .sort((a, b) => a.order - b.order)
        .map((item) => ({ url: item.url, type: item.type })),
    }))

  const handleOpenGroup = (index: number) => {
    setActiveGroupIndex(index)
    setInitialStoryIndex(0)
  }

  const handleGoToGroup = (nextIndex: number) => {
    if (nextIndex < 0 || nextIndex >= storyGroups.length) {
      setActiveGroupIndex(null)
      return
    }
    setActiveGroupIndex(nextIndex)
    setInitialStoryIndex(
      nextIndex > (activeGroupIndex ?? 0)
        ? 0
        : storyGroups[nextIndex].stories.length - 1,
    )
  }

  return (
    <>
      <section className="mt-4 sm:mt-5 md:mt-6 lg:mt-8 mb-4 sm:mb-5 md:mb-6 px-4 sm:px-6 md:px-8">
        <div className="w-full flex justify-center">
          <div
            className="flex flex-none flex-row items-start justify-center gap-3 sm:gap-[14px] md:gap-4 lg:gap-[18px]"
            style={{ maxWidth: '100%' }}
          >
            {storyGroups.map((group, index) => {
              const story = stories.find((s) => s.id === group.id)
              const preview = story ? getCirclePreviewSources(story) : null

              return (
                <div
                  key={group.id}
                  className="flex flex-col items-center text-center shrink-0"
                >
                  <button
                    type="button"
                    onClick={() => handleOpenGroup(index)}
                    className="relative flex items-center justify-center w-[70px] h-[70px] sm:w-[80px] sm:h-[80px] md:w-[88px] md:h-[88px] lg:w-[96px] lg:h-[96px] rounded-full border border-black transition-all duration-300 hover:border-black/60"
                  >
                    <div className="w-[62px] h-[62px] sm:w-[72px] sm:h-[72px] md:w-[79px] md:h-[79px] lg:w-[87px] lg:h-[87px] rounded-full overflow-hidden bg-white">
                      <StoryCirclePreview
                        imageUrl={preview?.imageUrl}
                        videoUrl={preview?.videoUrl}
                        alt={group.title}
                      />
                    </div>
                  </button>
                  <span className="text-[11px] sm:text-[12px] md:text-[13px] leading-[14px] sm:leading-[15px] md:leading-[16px] font-medium mt-1.5 sm:mt-2 text-neutral-700 text-center max-w-[70px] sm:max-w-[80px] md:max-w-[88px] lg:max-w-[96px] line-clamp-2 break-words hyphens-auto">
                    {group.title}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {activeGroupIndex !== null && (
        <StoryViewer
          groups={storyGroups}
          currentGroupIndex={activeGroupIndex}
          initialStoryIndex={initialStoryIndex}
          onClose={() => setActiveGroupIndex(null)}
          onGoToGroup={handleGoToGroup}
        />
      )}
    </>
  )
}

import { getStories } from '@/api/settingsApi'
import type { StoryMediaType } from '@/lib/storyMedia'

export interface StoryMediaItem {
  id: string
  url: string
  type: StoryMediaType
  order: number
}

export interface StoryNode {
  id: string
  title: string
  slug: string
  /** Обложка для кружка на главной */
  coverUrl?: string | null
  image?: string | null
  order: number
  isPublished: boolean
  publishedAt?: string | null
  items: StoryMediaItem[]
}

/** Сторис из Nest `GET /settings/stories` → форма StoryNode для StoryBlock/StoryViewer. */
export async function getAllStories(): Promise<StoryNode[]> {
  try {
    const stories = await getStories()
    return stories
      .filter((st) => st.slides.length > 0)
      .map((st, idx) => ({
        id: st.id,
        title: st.title,
        slug: st.slug,
        coverUrl: st.coverUrl,
        image: st.coverUrl,
        order: st.sortOrder ?? idx,
        isPublished: st.active,
        publishedAt: null,
        items: st.slides.map((sl, i) => ({
          id: sl.id,
          url: sl.url,
          type: sl.mediaType === 'video' ? 'video' : 'image',
          order: sl.sortOrder ?? i,
        })),
      }))
  } catch {
    return []
  }
}

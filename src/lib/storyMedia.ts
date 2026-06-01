export type StoryMediaType = 'image' | 'video'

const VIDEO_EXT = /\.(mp4|webm|mov|m4v)(\?|$)/i
const VIDEO_MIME = /^video\//

export function getStoryMediaType(
  url: string,
  contentType?: string | null,
): StoryMediaType {
  if (contentType && VIDEO_MIME.test(contentType)) return 'video'
  if (VIDEO_EXT.test(url)) return 'video'
  return 'image'
}

export function isStoryMediaAttributeSlug(slug: string, name: string): boolean {
  const s = slug.toLowerCase()
  const n = name.toLowerCase()
  return (
    s.includes('kartinka') ||
    s.includes('image') ||
    s.includes('картинка') ||
    s.includes('video') ||
    s.includes('видео') ||
    s.includes('mp4') ||
    n.includes('картинка') ||
    n.includes('видео') ||
    n.includes('video')
  )
}

export function storyMediaOrderKey(slug: string, type: StoryMediaType): number {
  const num = parseInt(slug.match(/\d+/)?.[0] || '0', 10)
  const typeOrder = type === 'image' ? 0 : 1
  return num * 10 + typeOrder
}

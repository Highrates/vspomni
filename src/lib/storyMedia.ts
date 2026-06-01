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

/** Обложка кружка на главной (не слайд в ленте) */
export function isStoryCoverAttributeSlug(slug: string, name: string): boolean {
  const s = slug.toLowerCase()
  const n = name.toLowerCase()
  return (
    s.includes('oblozhka') ||
    s.includes('cover') ||
    s.includes('preview') ||
    s.includes('poster') ||
    s.includes('avatar') ||
    s.includes('обложка') ||
    s.includes('превью') ||
    n.includes('обложка') ||
    n.includes('превью') ||
    n.includes('cover')
  )
}

export function isStorySlideAttributeSlug(slug: string, name: string): boolean {
  if (isStoryCoverAttributeSlug(slug, name)) return false
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

/** @deprecated use isStorySlideAttributeSlug */
export function isStoryMediaAttributeSlug(slug: string, name: string): boolean {
  return isStorySlideAttributeSlug(slug, name)
}

export function storyMediaOrderKey(slug: string, type: StoryMediaType): number {
  const num = parseInt(slug.match(/\d+/)?.[0] || '0', 10)
  const typeOrder = type === 'image' ? 0 : 1
  return num * 10 + typeOrder
}

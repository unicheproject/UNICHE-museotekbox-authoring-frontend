import { reactive } from 'vue'
import { MEDIA_TYPES, getMediaContent, listMedia, uploadMedia, type MediaDto, type MediaKind } from '@/api/museotekBox'
import { MEDIA, type MediaItem } from './engine'

/**
 * The organisation's media library, as the authoring screens use it: loaded once when an
 * experience opens, added to by uploads from any media field, and shown as thumbnails.
 */

let orgId: string | null = null

const toItem = (m: MediaDto): MediaItem => ({ id: m.id, kind: m.kind, name: m.name })

/** Fill the library for this organisation. A failure is the caller's to report. */
export async function loadMediaLibrary(org: string): Promise<void> {
  const items = await listMedia(org)
  orgId = org
  MEDIA.splice(0, MEDIA.length, ...items.map(toItem))
}

/**
 * What a media field offers, by the kind it asks for. A picture is an image; "visual" is anything
 * shown on the screen, a picture or a video.
 */
export type PickKind = 'VISUAL' | 'PICTURE' | 'IMAGE' | 'ILLUSTRATION' | 'VIDEO' | 'AUDIO'

export function kindsFor(kind: PickKind): MediaKind[] {
  if (kind === 'VISUAL') return ['IMAGE', 'VIDEO']
  if (kind === 'VIDEO' || kind === 'AUDIO') return [kind]
  return ['IMAGE']
}

/** The file chooser's `accept`, for a field of this kind. */
export const acceptFor = (kind: PickKind) => kindsFor(kind).flatMap((k) => MEDIA_TYPES[k]).join(',')

/** Upload a file into the library; it is added to the top of the list and returned. */
export async function addToLibrary(file: File, onProgress?: (percent: number) => void): Promise<MediaItem> {
  if (!orgId) throw new Error('The media library is not loaded.')
  const item = toItem(await uploadMedia(orgId, file, onProgress))
  MEDIA.unshift(item)
  return item
}

/**
 * Object URLs for thumbnails (a picture, or a video for its first frame), fetched with the bearer token
 * the first time one is shown.
 * A file never changes under its id, so one fetch per id is enough.
 */
const thumbs = reactive<Record<string, string>>({})
const asked = new Set<string>()

export function thumbOf(id: string): string | undefined {
  // Read it first even when it is not there yet, so whatever shows it updates once it arrives.
  const url = thumbs[id]
  if (url || !orgId || asked.has(id)) return url
  asked.add(id)
  getMediaContent(orgId, id)
    .then((blob) => (thumbs[id] = URL.createObjectURL(blob)))
    .catch(() => asked.delete(id))
  return undefined
}

/** Any library file as an object URL — a picture, a sound or a video — fetched once with the token. */
export async function loadMediaUrl(id: string): Promise<string | undefined> {
  if (thumbs[id]) return thumbs[id]
  if (!orgId) return undefined
  try {
    const blob = await getMediaContent(orgId, id)
    asked.add(id)
    thumbs[id] = URL.createObjectURL(blob)
    return thumbs[id]
  } catch {
    return undefined
  }
}

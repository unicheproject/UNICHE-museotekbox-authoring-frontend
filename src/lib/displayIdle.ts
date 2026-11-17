import type { CardColour, ExperienceDto, ProjectDto, ScanObjectDto, ScanObjectTypeDto } from '@/api/museotekBox'

/**
 * The idle screen of a Box's display: which experiences it can play and the card that starts each.
 * Framework-free so it can be tested on its own.
 *
 * Phase 1 builds this from the CMS endpoints that exist today. The start card comes from the
 * experience as last saved, not from the published copy the Box plays: no endpoint returns the
 * published copy's start card yet. The display's own `GET /display/idle` (Phase 2) replaces this.
 */

export interface StartCard {
  name: string
  /** Only when every coloured card of that type has the same colour; null for objects (a vase replica). */
  colour: CardColour | null
}

export interface DisplayTile {
  id: string
  name: string
  /** Null when the experience has no start card, or it could not be read. */
  card: StartCard | null
}

/** At most this many tiles on one screen; more rotate in pages. */
export const TILES_PER_PAGE = 4

/**
 * The start card of an experience: the card type on its start scene, named, and coloured from the
 * organisation's coloured cards of that type (card types carry no colour of their own).
 */
export function startCardOf(
  experience: ExperienceDto | null,
  types: readonly ScanObjectTypeDto[],
  objects: readonly ScanObjectDto[],
): StartCard | null {
  const typeId = experience?.scenes.find((s) => s.isStart)?.initCardTypeId
  if (typeId == null) return null
  const type = types.find((t) => t.id === typeId)
  if (!type) return null
  const colours = new Set(
    objects
      .filter((o) => o.scanObjectTypeId === type.id && o.kind === 'COLOURED_CARD' && o.colour)
      .map((o) => o.colour as CardColour),
  )
  return { name: type.name, colour: colours.size === 1 ? [...colours][0] : null }
}

/** One tile per experience on the Box, by name. `experiences` holds null for one that could not be read. */
export function displayTiles(
  projects: readonly ProjectDto[],
  experiences: Readonly<Record<string, ExperienceDto | null>>,
  types: readonly ScanObjectTypeDto[],
  objects: readonly ScanObjectDto[],
): DisplayTile[] {
  return projects
    .map((p) => ({ id: p.id, name: p.name, card: startCardOf(experiences[p.id] ?? null, types, objects) }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

/**
 * Splits tiles into pages of at most `max`, as evenly as possible: 6 become 3 + 3, 5 become 3 + 2,
 * 9 become 3 + 3 + 3. Up to `max` stay on one page. No tiles means no pages.
 */
export function paginate<T>(items: readonly T[], max = TILES_PER_PAGE): T[][] {
  if (!items.length) return []
  const pages = Math.ceil(items.length / max)
  const size = Math.ceil(items.length / pages)
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}

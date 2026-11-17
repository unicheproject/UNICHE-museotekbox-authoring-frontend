/**
 * When the Dashboard's "Get started" guide shows, and how a page knows it was reached from it.
 *
 * The rule: the guide starts only for an organisation that is entirely empty (no scan objects,
 * experiences or Boxes) the first time its manager opens the Dashboard. From then on it stays,
 * however full the organisation gets. "×" hides it for now: the Dashboard then offers "Show getting
 * started guide" while steps are left, and it comes back where it was. "Got it", once all five are
 * done, ends it for good. An organisation already in use (Test Museum) never starts it.
 *
 * The mark lives in this browser only (a display preference, not account data); on another
 * computer an organisation that is no longer empty shows no guide. Every storage access is wrapped:
 * without storage the guide simply behaves as if nothing was stored.
 */

/** started: showing · hidden: put away with ×, can come back · done: finished with Got it, gone. */
export type GuideMark = 'started' | 'hidden' | 'done'

const keyOf = (orgId: string) => `museotek.guide.${orgId}`

export function readGuideMark(orgId: string): GuideMark | null {
  try {
    const v = window.localStorage.getItem(keyOf(orgId))
    return v === 'started' || v === 'hidden' || v === 'done' ? v : null
  } catch {
    return null
  }
}

export function writeGuideMark(orgId: string, mark: GuideMark): void {
  try {
    window.localStorage.setItem(keyOf(orgId), mark)
  } catch {
    /* no storage: nothing is remembered */
  }
}

export interface GuideDecision {
  show: boolean
  /** This is the moment it starts: the caller stores "started". */
  start: boolean
  /** Hidden with × while steps are left: offer "Show getting started guide". */
  restorable: boolean
}

/** What the Dashboard does with the guide. `emptyOrg` is only asked when nothing is stored yet. */
export function guideDecision(mark: GuideMark | null, emptyOrg: boolean, allDone = false): GuideDecision {
  if (mark === 'done') return { show: false, start: false, restorable: false }
  if (mark === 'hidden') return { show: false, start: false, restorable: !allDone }
  if (mark === 'started') return { show: true, start: false, restorable: false }
  return emptyOrg ? { show: true, start: true, restorable: false } : { show: false, start: false, restorable: false }
}

/** The guide's step a page was opened for (`?guide=2`), or null when it was reached any other way. */
export function guideStepOf(query: Record<string, unknown>): number | null {
  const raw = Array.isArray(query.guide) ? query.guide[0] : query.guide
  const n = Number(raw)
  return Number.isInteger(n) && n >= 1 && n <= 5 ? n : null
}

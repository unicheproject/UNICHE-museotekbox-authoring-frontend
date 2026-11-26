/**
 * The classes of the experience screens (the Experiences list and the Dashboard), kept in one
 * place so both draw the same grid, header buttons and boxes. Moved here unchanged from
 * Experiences.vue; nothing new.
 */

/** The card grid. Past laptop size the page is not capped (route meta `wide`), so it adds columns. */
export const cardGrid = 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3 min-[1700px]:grid-cols-4 min-[2300px]:grid-cols-5'

/** The header buttons, uppercase. The gradient one is the styleguide's pill (`.btn-grad`, globals.css). */
export const headBtnOutline =
  'inline-flex items-center justify-center gap-2 rounded-md border border-input bg-white px-3.5 py-2 text-[11.5px] font-extrabold uppercase tracking-button text-secondary-foreground hover:border-brand-deep hover:text-brand-deep'
export const headBtnGrad =
  'btn-grad inline-flex items-center justify-center gap-2 px-3.5 py-2 text-[11.5px] font-extrabold uppercase tracking-button shadow-md transition-transform hover:-translate-y-0.5'

/** The white box of an experience card, with its hover; for anything that should sit beside the cards. */
export const cardBox =
  'rounded-lg border border-border bg-white shadow-xs transition-all hover:-translate-y-0.5 hover:border-brand-deep/35 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring'

/** The page title and the line under it. */
export const pageTitle = 'text-2xl font-extrabold tracking-tight'
export const pageSubtitle = 'mt-0.5 text-[13px] text-muted-foreground'

/** A status pill (moved unchanged from ExperienceBadges); add one of `pillTone`. */
export const pill = 'inline-flex items-center gap-1.5 rounded-pill px-2.5 py-0.5 text-[12px] font-bold whitespace-nowrap'
export const pillTone = {
  outline: 'border border-border bg-white text-secondary-foreground',
  neutral: 'bg-surface-2 text-secondary-foreground',
  brand: 'bg-brand-deep/[.07] text-brand-deep',
  success: 'bg-emerald-50 text-success',
  warning: 'bg-warning/[.06] text-warning ring-1 ring-warning/25',
  danger: 'bg-red-50 text-destructive',
} as const

/** The selected state of an outline button (moved unchanged from ExperienceHeader). */
export const outlineOn = 'border-brand-deep text-brand-deep bg-brand-deep/[.04]'

/**
 * The brand-gradient band of an inventory card with no colour of its own, when not `compact`. No
 * screen draws that today (Boxes and Scan objects pass `compact`, a soft tint); the experience card
 * no longer uses it for a missing picture.
 */
export const coverFallback = 'bg-gradient-to-br from-brand-deep to-[#7b3fb8]'

/** The "Open →" at the foot of a card. */
export const cardOpen = 'inline-flex shrink-0 items-center gap-1 text-xs font-bold text-brand-deep'

/** The classes of the authoring pages, as the reviewed design draws them. */
export const bigInput =
  'w-full rounded-md border border-input bg-white px-3 py-2 text-[14px] outline-none focus:border-brand-deep focus:ring-2 focus:ring-brand-deep/20'
export const btnOutline =
  'inline-flex items-center justify-center gap-2 rounded-md border border-input bg-white px-4 py-2.5 text-[12px] font-extrabold uppercase tracking-button text-secondary-foreground hover:border-brand-deep hover:text-brand-deep disabled:opacity-40'
export const btnDeep =
  'inline-flex items-center justify-center gap-2 rounded-md bg-brand-deep px-4 py-2.5 text-[12px] font-extrabold uppercase tracking-button text-white hover:bg-brand-deep/90 disabled:cursor-not-allowed disabled:opacity-40'
export const btnGrad =
  'inline-flex items-center justify-center gap-2 rounded-md bg-grad-brand px-4 py-2.5 text-[12px] font-extrabold uppercase tracking-button text-white shadow-md transition-transform hover:-translate-y-0.5'
/** A dashed "add" button, full width. */
export const addBtn =
  'flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-brand-deep/30 py-4 text-[14px] font-extrabold text-brand-deep hover:border-brand-deep hover:bg-brand-deep/[.03]'
/** A small text action inside a row: Change. */
export const rowLink = 'shrink-0 rounded-lg px-3 py-2 text-[13.5px] font-bold text-brand-deep hover:bg-brand-deep/[.06]'
/** A small text action inside a row: Remove. */
export const rowRemove = 'shrink-0 rounded-lg px-3 py-2 text-[13.5px] font-bold text-muted-foreground hover:bg-red-50 hover:text-destructive'
/**
 * The one dialog pattern. `overlay` centres the box and never scrolls itself (`dialog-overlay` also
 * locks the page underneath, see globals.css); the box is a column capped to the viewport, with a
 * fixed head and foot and `dialogBody` as its only scroll area. z-[60] puts it above the side panel
 * (z-50); ConfirmDialog sits above that (z-[70]).
 */
export const overlay =
  'dialog-overlay fixed inset-0 z-[60] flex items-center justify-center bg-[#0b1020]/50 p-4 backdrop-blur-[2px] sm:p-10'
export const dialogBox =
  'dialog-in relative flex max-h-[calc(100dvh-2rem)] w-full flex-col overflow-hidden rounded-lg bg-white shadow-2xl sm:max-h-[min(calc(100dvh-5rem),56rem)]'
export const dialogHead = 'flex shrink-0 items-start gap-3 border-b border-border px-5 py-4 sm:px-7'
export const dialogTitle = 'text-[17px] font-extrabold leading-tight'
export const dialogSub = 'mt-1 text-[13px] leading-snug text-muted-foreground'
export const dialogClose =
  '-mr-1.5 shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-deep'
export const dialogBody = 'min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-7 sm:py-6'
export const dialogFoot = 'flex shrink-0 flex-wrap items-center justify-end gap-3 border-t border-border bg-white px-5 py-4 sm:px-7'

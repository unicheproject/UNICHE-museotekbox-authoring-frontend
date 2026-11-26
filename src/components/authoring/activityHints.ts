/**
 * One short line per activity for the pickers ("what does the visitor do here?"), under each
 * activity's name. UI copy only: the activities themselves live in `lib/authoring/engine.ts`.
 * '' is "Decide later" in the New experience dialog.
 */
export const ACTIVITY_HINT: Record<string, string> = {
  '': 'Create the experience now and add activities later.',
  quiz: 'Visitors answer questions by placing objects on the Box.',
  'scan-discover': 'Visitors place any object to hear or see its story.',
  treasure: 'Visitors find objects one by one, in the right order.',
  guided: 'Visitors follow chapters that play one after another.',
  scratch: 'One empty scene; you build everything yourself.',
}

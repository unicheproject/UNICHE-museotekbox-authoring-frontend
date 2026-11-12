import { template, type Authoring } from './engine'

/**
 * Each kind of step has its own colours — the Start, every kind of activity, the End — so a step is
 * recognised by its tile before its name is read: [icon colour, background].
 */
const TONE: Record<string, [string, string]> = {
  start: ['#4c1d8b', '#ede7f6'],
  quiz: ['#c0185e', '#fde7f1'],
  guided: ['#0f7a6e', '#ddf3ef'],
  'scan-discover': ['#2d5aa0', '#e4edf9'],
  treasure: ['#9a6200', '#fcf1d8'],
  scratch: ['#374151', '#eceef2'],
  end: ['#111827', '#e9eaee'],
}
const NEUTRAL: [string, string] = ['#374151', '#eceef2']

/** The colours of a template ('quiz', …), or of 'start' / 'end'. */
export const toneOf = (id: string): [string, string] => TONE[id] ?? NEUTRAL

const templateOf = (a: Authoring, key: string) => a.islands.find((x) => x.key === key)?.templateId ?? ''

/** A step of the visit ('start', an activity key, 'end'): its colours, icon and name. */
export const stepTone = (a: Authoring, key: string) => toneOf(key === 'start' || key === 'end' ? key : templateOf(a, key))
export const stepGlyph = (a: Authoring, key: string) =>
  key === 'start' ? 'bolt' : key === 'end' ? 'flag' : template(templateOf(a, key)).icon
/** Its name; when several activities are of one kind they are numbered in visit order ("Quiz 2"). */
export function stepTitle(a: Authoring, key: string) {
  if (key === 'start') return 'Start'
  if (key === 'end') return 'End'
  const kind = templateOf(a, key)
  const name = template(kind).name
  const same = a.islands.filter((x) => x.templateId === kind)
  return same.length > 1 ? `${name} ${same.findIndex((x) => x.key === key) + 1}` : name
}
/** Every step of the visit, in order. */
export const stepKeys = (a: Authoring) => ['start', ...a.islands.map((x) => x.key), 'end']

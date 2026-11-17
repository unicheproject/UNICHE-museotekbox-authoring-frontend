import { hasDisplay, mediaOf, num, questionsOnly, scanType, scenesOf, template, type Authoring } from './engine'
import { chip } from './html'
import { thumbOf } from './media'

/** What a step does, in one sentence (may carry markup; names are escaped by the engine). */
export function stepSentence(a: Authoring, k: string): string {
  const d = a.details
  if (k === 'start')
    return d.startCard
      ? `The visit starts when the visitor places the ${chip(scanType(a, d.startCard))}.`
      : 'The visit starts when the visitor places a scan.'
  if (k === 'end')
    return d.goodbye
      ? `A goodbye for ${num(d.endSeconds) || 10} seconds, then the Box waits for the next visitor.`
      : 'The Box waits for the next visitor.'
  const isl = a.islands.find((x) => x.key === k)
  if (!isl) return ''
  const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`
  const cfg = isl.cfg
  switch (isl.templateId) {
    case 'quiz': {
      const n = questionsOnly(cfg.questions).length
      const slides = (cfg.questions || []).length - n
      return `${plural(n, 'question')}${slides ? ` and ${plural(slides, 'slide')}` : ''}. The visitor answers by placing a scan.`
    }
    case 'guided':
      return `${plural((cfg.chapters || []).length, 'chapter')}, one after another.`
    case 'scan-discover':
      return `${plural((cfg.objects || []).length, 'object')}, one after another.`
    case 'treasure':
      return `${plural((cfg.clues || []).length, 'clue')}, one after another.`
    case 'scratch':
      return 'Built in Scenes and rules.'
    default:
      return template(isl.templateId).summary(a, cfg)
  }
}

/** The picture a step shows first, if it shows one. */
export function stepThumb(a: Authoring, k: string): string | undefined {
  if (!hasDisplay(a)) return undefined
  if (k === 'start') {
    const m = mediaOf(a.details.welcomeMedia)
    return m && m.kind === 'IMAGE' ? thumbOf(m.id) : undefined
  }
  const id = scenesOf(a, k)
    .flatMap((sc) => sc.blocks)
    .map((b) => (b.type === 'IMAGE' ? b.content?.mediaId : null))
    .find((x): x is string => typeof x === 'string')
  return id ? thumbOf(id) : undefined
}

/** What a step does in a few words, for its tile in the row of steps (the full sentence is its tooltip). */
export function stepBrief(a: Authoring, k: string): string {
  const d = a.details
  if (k === 'start') return d.startCard ? `Starts on ${chip(scanType(a, d.startCard))}` : 'Starts when a scan is placed'
  if (k === 'end') return d.goodbye ? `Goodbye for ${num(d.endSeconds) || 10} s, then waits` : 'Waits for the next visitor'
  const isl = a.islands.find((x) => x.key === k)
  if (!isl) return ''
  const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`
  const cfg = isl.cfg
  switch (isl.templateId) {
    case 'quiz': {
      const n = questionsOnly(cfg.questions).length
      const slides = (cfg.questions || []).length - n
      return `${plural(n, 'question')}${slides ? ` · ${plural(slides, 'slide')}` : ''}`
    }
    case 'guided':
      return plural((cfg.chapters || []).length, 'chapter')
    case 'scan-discover':
      return plural((cfg.objects || []).length, 'object')
    case 'treasure':
      return plural((cfg.clues || []).length, 'clue')
    default:
      return stepSentence(a, k)
  }
}

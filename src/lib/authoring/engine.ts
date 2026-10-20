/**
 * The authoring engine: the activities an experience is made of, and how they
 * are turned into the scenes and rules the Box follows.
 *
 * Written for curators, not engineers: the author answers plain questions per activity and the rule
 * graph is generated underneath. Every function takes the experience it works on (`Authoring`)
 * instead of reading a global, so the same code serves any page.
 *
 * Text that ends up on screen with markup in it (summaries, hand-over phrases) is built here as an
 * HTML string with every author-typed value escaped, and is rendered with
 * `v-html`.
 */
import { reactive } from 'vue'
import { chip, esc } from './html'

// ─────────────────────────── types ───────────────────────────

export type OutputId = 'DISPLAY' | 'BOX'
export type LinkHow = 'now' | 'time' | 'video' | 'scan' | 'any'
export type ReplyKind = 'correct' | 'hint' | 'wrong'

/** Any answer an activity's form collects; each template reads its own keys. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Cfg = Record<string, any>

/** How the visitor gets from one step to the next. */
export interface Link {
  how: LinkHow
  seconds: number | string
  scan: string
}

export interface Reply {
  color: string
  text: string
  media: string
  audio: string
  boxVideo: string
}

export interface CustomReply {
  scan: string
  color: string
  text: string
  audio: string
}

/** What belongs to the whole experience rather than to one activity. */
export interface Details {
  name: string
  output: OutputId
  startCard: string
  welcomeMedia: string
  welcomeAudio: string
  welcomeBoxVideo: string
  startNext: Link
  goodbye: boolean
  endMedia: string
  endAudio: string
  endSeconds: number | string
  replies: Record<ReplyKind, Reply>
  customs: CustomReply[]
}

/** One activity of the visit: a template, its answers, and the hand-over that leaves it. */
export interface Island {
  key: string
  templateId: string
  cfg: Cfg
  next: Link
  sceneIds?: string[]
  entryId?: string
  exitId?: string
}

export type Trigger =
  | { type: 'SCAN'; cardTypeId: string | null }
  | { type: 'SCAN_OTHER' }
  | { type: 'TIMER_ELAPSED'; seconds: number }
  | { type: 'VIDEO_ENDED' }
  | { type: 'SCENE_ENTERED' }
  | { type: 'SESSION_STARTED' }

export type Condition =
  | { type: 'VAR_CMP'; var: string; op: string; value: number }
  | { type: 'FLAG_IS'; var: string; value: boolean }

export type Effect =
  | { type: 'SET_NUMBER'; var: string; value: number }
  | { type: 'ADD_NUMBER'; var: string; amount: number }
  | { type: 'SET_FLAG'; var: string; value: boolean }
  | { type: 'BOX_SCREEN'; text: string }
  | { type: 'BOX_AUDIO'; url: string }
  | { type: 'REPLY'; color: string; text: string; media: string; audio: string; boxVideo: string }

export type Destination = { type: 'GO_TO'; targetSceneKey: string | null } | { type: 'STAY' } | { type: 'END' }

export interface Rule {
  key: string
  label: string
  trigger: Trigger
  condition: Condition | null
  effects: Effect[]
  destination: Destination
  chain: boolean
  /** A hand-over between two steps, as opposed to a rule of the activity itself. */
  link?: boolean
}

export interface Block {
  type: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  content: Record<string, any>
}

export type SceneKind = 'intro' | 'story' | 'question' | 'feedback' | 'outro'

export interface Scene {
  id: string
  /** The step it belongs to: '@start', '@end' or an island key. */
  island?: string
  name: string
  kind: SceneKind
  role?: 'start' | 'end'
  start?: boolean
  initCard?: string | null
  blocks: Block[]
  rules: Rule[]
  position?: number
  key?: string
  needsContent?: boolean
  needsCorrect?: boolean
  needsVideo?: boolean
}

export interface Variable {
  key: string
  kind: 'NUMBER' | 'FLAG'
  initial: number | boolean
}

export interface Built {
  scenes: Scene[]
  variables: Variable[]
}

/** A kind of object the visitor can place on the Box, as the authoring screens show it. */
export interface ScanType {
  id: string
  name: string
  swatch: string
  draft?: boolean
  unregistered?: boolean
}

/** One experience being authored: everything the engine reads and writes. */
/**
 * A scene's rules as changed by hand in Scenes and rules, with a stamp of the rules the forms
 * generated for it at the time. While the forms still generate the same rules the change stands;
 * once the activity's own form changes that scene, the form wins.
 */
export interface SceneEdit {
  stamp: string
  rules: Rule[]
}

export interface Authoring {
  details: Details
  islands: Island[]
  built: Built
  islandSeq: number
  scanTypes: ScanType[]
  /** Hand changes from Scenes and rules, by scene id. */
  edits?: Record<string, SceneEdit>
}

/** What the forms generated for a scene, without the keys that shift as scenes come and go. */
export const rulesStamp = (rules: Rule[]) => JSON.stringify(rules.map(({ key: _key, label: _label, ...r }) => r))

// ─────────────────────────── small helpers ───────────────────────────

/** Everything the author has not typed yet shows a stand-in rather than a blank. */
export const or = (value: unknown, fallback: string) => String(value || '').trim() || fallback
export const num = (v: unknown) => Number(v) || 0
/** A count typed by the author, as the whole number the Box needs (never below 0). */
export const whole = (v: unknown) => Math.max(0, Math.round(num(v)))
/** Seconds typed by the author: a whole number of at least 1, or the fallback when none was typed. */
export const secs = (v: unknown, fallback = 10) => whole(v) || fallback
export const card = (v: string | null | undefined) => v || null
export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export function scanType(a: Pick<Authoring, 'scanTypes'>, id: string | null | undefined): ScanType {
  return (
    a.scanTypes.find((s) => s.id === id) ||
    (id ? { id, name: String(id), swatch: '#9ca3af', unregistered: true } : { id: '', name: '—', swatch: '#9ca3af' })
  )
}
export const scanName = (a: Pick<Authoring, 'scanTypes'>, v: string | null | undefined) => (v ? scanType(a, v).name : '')

/** A closed palette instead of a colour picker: six named colours, each legible as an overlay. */
export const COLORS = [
  { id: 'green', name: 'Green', hex: '#0f7a6e' },
  { id: 'yellow', name: 'Yellow', hex: '#c98a00' },
  { id: 'red', name: 'Red', hex: '#c0185e' },
  { id: 'blue', name: 'Blue', hex: '#2d5aa0' },
  { id: 'purple', name: 'Purple', hex: '#6d28b5' },
  { id: 'grey', name: 'Grey', hex: '#4b5563' },
]
export const colorHex = (id: string) => (COLORS.find((c) => c.id === id) || COLORS[5]).hex

/**
 * The organisation's media library, filled from the backend when an experience opens (see
 * media.ts). A media field holds an item's id; a value that is not one of these ids is an older,
 * hand-typed file name, shown as it is and left out of what the Box plays.
 */
export interface MediaItem {
  id: string
  kind: 'IMAGE' | 'VIDEO' | 'AUDIO'
  name: string
}
export const MEDIA = reactive<MediaItem[]>([])
export const mediaOf = (v: string | null | undefined) => (v ? MEDIA.find((m) => m.id === v) : undefined)
/** What a media field is called on screen: the file's name, or what was typed. */
export const mediaName = (v: string | null | undefined) => mediaOf(v)?.name ?? v ?? ''

// ─────────────────────────── where it plays ───────────────────────────

export const OUTPUTS: Record<OutputId, { id: OutputId; name: string; icon: string; blurb: string }> = {
  DISPLAY: {
    id: 'DISPLAY',
    name: 'Box and a screen',
    icon: 'film',
    blurb:
      'A screen is connected to the Box. Questions are shown as an image, a video or an illustration; replies appear as a coloured overlay.',
  },
  BOX: {
    id: 'BOX',
    name: 'Box only',
    icon: 'audio',
    blurb: 'No screen. Everything the visitor gets is sound from the Box: the question is spoken and so is every reply.',
  },
}
export const hasDisplay = (a: Pick<Authoring, 'details'>) => a.details.output === 'DISPLAY'

// ─────────────────────────── the rule vocabulary ───────────────────────────
// A rule is one sentence: one trigger + an optional condition + ordered effects + one destination.
// Of the rules on the scene whose trigger matches, the first whose condition holds runs.

export const onScan = (cardTypeId: string | null): Trigger => ({ type: 'SCAN', cardTypeId: cardTypeId ?? null })
export const onOther = (): Trigger => ({ type: 'SCAN_OTHER' })
export const onSeconds = (seconds: number): Trigger => ({ type: 'TIMER_ELAPSED', seconds })
export const onEnter = (): Trigger => ({ type: 'SCENE_ENTERED' })
export const onVideo = (): Trigger => ({ type: 'VIDEO_ENDED' })

export const cmp = (v: string, op: string, value: number): Condition => ({ type: 'VAR_CMP', var: v, op, value })

export const setNum = (v: string, value: number): Effect => ({ type: 'SET_NUMBER', var: v, value })
export const addNum = (v: string, amount: number): Effect => ({ type: 'ADD_NUMBER', var: v, amount })

/** A reply: the coloured panel over the screen, the sound, or both — to the author it is one thing. */
export const reply = (r: Partial<Reply>): Effect => ({
  type: 'REPLY',
  color: r.color || '',
  text: r.text || '',
  media: r.media || '',
  audio: r.audio || '',
  boxVideo: r.boxVideo || '',
})

export const goTo = (targetSceneKey: string | null): Destination => ({ type: 'GO_TO', targetSceneKey })
export const STAY: Destination = { type: 'STAY' }
export const END: Destination = { type: 'END' }

let ruleSeq = 0
export const rule = (
  label: string,
  trigger: Trigger,
  o: { condition?: Condition; effects?: Effect[]; destination?: Destination; chain?: boolean } = {},
): Rule => ({
  key: 'r' + ++ruleSeq,
  label,
  trigger,
  condition: o.condition || null,
  effects: o.effects || [],
  destination: o.destination || STAY,
  chain: o.chain || false,
})

// Blocks — what a scene puts on the screen or through the speaker.
export const IMAGE = (url: string): Block => ({ type: 'IMAGE', content: { url } })
export const VIDEO = (url: string): Block => ({ type: 'VIDEO', content: { url } })
export const ILLUS = (url: string): Block => ({ type: 'ILLUSTRATION', content: { url } })
export const AUDIO = (url: string): Block => ({ type: 'AUDIO', content: { url } })

/** A content row the author added, as the block it stands for. */
const blockOf = (c: { type: string; name: string }) =>
  c.type === 'VIDEO'
    ? VIDEO(or(c.name, 'video'))
    : c.type === 'ILLUSTRATION'
      ? ILLUS(or(c.name, 'illustration'))
      : IMAGE(or(c.name, 'image'))

/** What a story or clue row plays: its own file, or a stand-in named after it. */
function rowBlocks(a: Authoring, row: Cfg, standIn: () => Block, audioStandIn: string): Block[] {
  if (!hasDisplay(a)) return [AUDIO(or(row.file, or(row.label, audioStandIn)))]
  return [row.file ? mediaBlock(row.file, '') : standIn()]
}

export function mediaBlock(name: string, fallback: string): Block {
  const m = mediaOf(name)
  const kind = m ? m.kind : /\.(mp4|mov|webm)$/i.test(name || '') ? 'VIDEO' : 'IMAGE'
  const url = or(name, fallback)
  return kind === 'VIDEO' ? VIDEO(url) : IMAGE(url)
}

// ─────────────────────────── screen templates for a question ───────────────────────────
// Instead of a picture, video or drawing of its own, a question can use one of eight ready-made
// screens: the question in words and up to four answers.

export const SCREEN_PRESETS = [
  { id: 'two', name: 'Two answers', media: '', answers: 2, objects: ['true', 'false'] },
  { id: 'list4', name: 'Answers in a list', media: '', answers: 4 },
  { id: 'grid4', name: 'Four tiles', media: '', answers: 4 },
  { id: 'corners', name: 'Four corners', media: '', answers: 4 },
  { id: 'pictop', name: 'Picture, then answers', media: 'PICTURE', answers: 3 },
  { id: 'picside', name: 'Picture beside', media: 'PICTURE', answers: 3 },
  { id: 'video', name: 'Watch, then answer', media: 'VIDEO', answers: 3 },
  { id: 'picans', name: 'Pictures as answers', media: '', answers: 3, pictures: true },
]
export const presetOf = (id: string) => SCREEN_PRESETS.find((p) => p.id === id)
export const LETTERS = 'ABCD'
/** An answer's colour and letter: the author's choice, or the object's colour and A–D. */
export const answerHex = (a: Pick<Authoring, 'scanTypes'>, ans: Cfg) =>
  ans.color ? colorHex(ans.color) : ans.scan ? scanType(a, ans.scan).swatch : '#475569'
export const answerLetter = (ans: Cfg, k: number) => String(ans.letter || '').trim() || LETTERS[k]
/** Answers for a layout: its number of answers, keeping what was already typed. They open empty. */
export function answersFor(p: (typeof SCREEN_PRESETS)[number], old: Cfg[] = []): Cfg[] {
  return Array.from({ length: Math.max(p.answers, Math.min(old.length, 4)) }, (_, k) =>
    old[k] ? { ...old[k] } : { text: '', scan: '', media: '' },
  )
}

export const isInfo = (q: Cfg | null | undefined) => !!q && q.kind === 'info'
export const questionsOnly = (qs: Cfg[] | undefined) => (qs || []).filter((q) => !isInfo(q))
export const usesScreen = (a: Authoring, q: Cfg | null | undefined) =>
  !!(q && q.kind === 'question' && q.screen && presetOf(q.screen) && hasDisplay(a))
/** The object that answers a question: typed in directly, or the ticked answer's. */
export const rightOf = (a: Authoring, q: Cfg | null | undefined): string =>
  usesScreen(a, q) ? ((q!.answers || [])[q!.right] || {}).scan || '' : (q && q.correct) || ''
/** Box-only has no video to wait for, so "when the video ends" falls back to time. */
export const infoMoveOn = (a: Authoring, q: Cfg) => (q.moveOn === 'video' && !hasDisplay(a) ? 'time' : q.moveOn || 'time')

/** What a question shows, given where the experience plays. In Box-only it becomes its audio. */
function questionBlocks(a: Authoring, q: Cfg): Block[] {
  if (!hasDisplay(a)) return [AUDIO(or(q.audio, 'question audio'))]
  if (usesScreen(a, q))
    return [{ type: 'SCREEN', content: { screen: q.screen, ask: q.ask, screenMedia: q.screenMedia, answers: q.answers || [] } }]
  const shown = (q.display || []).map(blockOf)
  return shown.length ? shown : [IMAGE('Question — nothing chosen yet')]
}

// ─────────────────────────── replies ───────────────────────────

export const REPLY_KINDS: { key: ReplyKind; label: string; hint: string }[] = [
  { key: 'correct', label: 'When they get it right', hint: 'Shown the moment the right object is scanned.' },
  { key: 'hint', label: 'When they ask for a clue', hint: 'Shown when the hint object is scanned. The question stays up.' },
  { key: 'wrong', label: 'When anything else is scanned', hint: 'The catch-all. The question stays up so they can try again.' },
]

function resolvedReply(cfg: Cfg, q: Cfg | null, kind: ReplyKind): Reply {
  const base = cfg.replies[kind]
  const over = (q && q.replies && q.replies[kind]) || {}
  return {
    color: over.color || base.color,
    text: or(over.text, base.text),
    media: or(over.media, base.media),
    audio: or(over.audio, base.audio),
    boxVideo: or(over.boxVideo, base.boxVideo),
  }
}

/** The Box's and screen's replies belong to the whole experience, so a visitor hears one voice. */
export const defaultReplies = (): Record<ReplyKind, Reply> => ({
  correct: { color: 'green', text: 'Correct!', media: '', audio: '', boxVideo: '' },
  hint: { color: 'yellow', text: 'Here is a clue…', media: '', audio: '', boxVideo: '' },
  wrong: { color: 'red', text: 'Not quite — try again', media: '', audio: '', boxVideo: '' },
})

export const newLink = (seconds = 10): Link => ({ how: 'time', seconds, scan: '' })
export const newQuestion = (n: number): Cfg => ({
  kind: 'question',
  name: 'Question ' + n,
  display: [],
  audio: '',
  correct: '',
  hint: '',
  screen: '',
  ask: '',
  screenMedia: '',
  answers: [],
  right: null,
  customs: [],
  replies: { correct: {}, hint: {}, wrong: {} },
})
export const newInfo = (n: number): Cfg => ({
  kind: 'info',
  name: 'Information ' + n,
  display: [],
  audio: '',
  moveOn: 'time',
  seconds: 10,
})

export function newDetails(over: Partial<Details> = {}): Details {
  return {
    name: '',
    output: 'DISPLAY',
    startCard: '',
    welcomeMedia: '',
    welcomeAudio: '',
    welcomeBoxVideo: '',
    startNext: newLink(5),
    goodbye: false,
    endMedia: '',
    endAudio: '',
    endSeconds: 10,
    replies: defaultReplies(),
    customs: [],
    ...over,
  }
}

// ─────────────────────────── authoring templates ───────────────────────────
// A template is one activity, not the whole visit. Each one declares a START scene (where the
// visitor comes in) and an END scene (where it hands over), and rebuild() joins them into one line:
// activity 1 → activity 2 → … → done. `build(cfg, ns)` turns plain answers into scenes and rules.

export interface TemplateField {
  key: string
  type: string
  label: string
  help?: string
  settings?: boolean
  bare?: boolean
  itemLabel?: string
  options?: string[]
  columns?: { key: string; type: string; label: string; placeholder?: string; options?: string[] }[]
}

export interface BuiltActivity {
  scenes: Scene[]
  entryId: string
  exitId: string
  variables: Variable[]
}

export interface Template {
  id: string
  name: string
  tagline: string
  icon: string
  badge?: string
  blurb: string
  example: string[]
  rulesLabel?: string
  rulesTitle?: string
  fields: TemplateField[]
  defaults: () => Cfg
  summary: (a: Authoring, cfg: Cfg) => string
  thumb: (cfg: Cfg) => string
  build: (a: Authoring, cfg: Cfg, ns: string) => BuiltActivity
}

export const TEMPLATES: Template[] = [
  {
    id: 'quiz',
    name: 'Quiz',
    tagline: 'Questions answered by putting an object on the Box',
    icon: 'quiz',
    badge: 'Most used',
    blurb:
      'The visitor is asked a question, and answers by placing an object on the Box. Right, wrong and "give me a clue" each get their own reply. A result closes the game.',
    example: ['Start', 'Question ×N', 'Result'],
    rulesLabel: 'Rules',
    rulesTitle: 'How the quiz is played',
    fields: [
      { key: 'questions', type: 'quiz-questions', label: 'Questions' },
      { key: 'game', type: 'game', label: 'Rules of the game', settings: true },
      { key: 'ending', type: 'ending', label: 'The result screen', settings: true },
      { key: 'replies', type: 'replies', label: 'Replies', settings: true, bare: true },
    ],
    defaults: () => ({
      questions: [newQuestion(1)],
      idleSeconds: '', // stop the quiz if nothing is scanned for this long
      winMode: 'count', // 'count' | 'all'
      winCount: '',
      resultMedia: '',
      resultWin: 'Well done!',
      resultLose: 'Thanks for playing',
      resultAudio: '',
    }),
    summary(_a, cfg) {
      const qs = cfg.questions || []
      const n = questionsOnly(qs).length
      const info = qs.length - n
      const target = cfg.winMode === 'all' ? n : whole(cfg.winCount)
      return `${n} question${n === 1 ? '' : 's'}${info ? ` · ${info} information` : ''} · wins with ${target || '—'} right`
    },
    thumb: (cfg) =>
      (cfg.questions || [])
        .flatMap((q: Cfg) => q.display || [])
        .map((c: Cfg) => c.name)
        .find(Boolean) || '',
    build(a, cfg, ns) {
      const id = (x: string) => ns + '-' + x
      const qs: Cfg[] = cfg.questions || []
      const next = (i: number) => (i + 1 < qs.length ? id('q' + (i + 1)) : id('result'))

      // Everything that can be scanned on a question scene, in the order the engine reads it: the
      // right object, the clue, the named exceptions, then the catch-all. First match wins.
      const answerRules = (q: Cfg, i: number) => {
        const rules: Rule[] = []
        const R = (k: ReplyKind) => resolvedReply(cfg, q, k)
        rules.push(
          rule('Right answer', onScan(card(rightOf(a, q))), {
            effects: [reply(R('correct')), addNum('correct', 1)],
            destination: goTo(next(i)),
          }),
        )
        if (q.hint)
          rules.push(
            rule('They asked for a clue', onScan(card(q.hint)), {
              effects: [reply(R('hint')), addNum('hints', 1)],
              destination: STAY,
            }),
          )
        ;[...(q.customs || []), ...(cfg.customs || [])].forEach((c: Cfg) => {
          if (!c.scan) return
          rules.push(
            rule('Reply for ' + or(scanName(a, c.scan), 'an object'), onScan(card(c.scan)), {
              effects: [reply({ color: c.color, text: or(c.text, '…'), audio: c.audio }), addNum('wrong', 1)],
              destination: STAY,
            }),
          )
        })
        rules.push(rule('Anything else', onOther(), { effects: [reply(R('wrong')), addNum('wrong', 1)], destination: STAY }))
        if (whole(cfg.idleSeconds))
          rules.push(rule('Nobody is playing any more', onSeconds(whole(cfg.idleSeconds)), { destination: goTo(id('result')) }))
        return rules
      }

      const scenes: Scene[] = []
      // The score is zeroed as the visitor reaches the first item: the quiz has no screen of its
      // own before it — the hand-over into it is the experience's.
      const zero = () =>
        rule('Set the score to zero', onEnter(), {
          effects: [setNum('correct', 0), setNum('wrong', 0), setNum('hints', 0)],
          destination: STAY,
        })

      qs.forEach((q, i) => {
        const blocks = [...questionBlocks(a, q), ...(hasDisplay(a) && q.audio ? [AUDIO(q.audio)] : [])]
        const needsContent = usesScreen(a, q)
          ? !String(q.ask || '').trim()
          : hasDisplay(a)
            ? !(q.display || []).length
            : !q.audio
        // Information between questions: something to watch or listen to, no answer expected.
        if (isInfo(q)) {
          const how = infoMoveOn(a, q)
          const hasVideo = (q.display || []).some((c: Cfg) => c.type === 'VIDEO')
          scenes.push({
            id: id('q' + i),
            name: or(q.name, 'Information'),
            kind: 'story',
            blocks,
            needsContent,
            needsVideo: how === 'video' && !hasVideo,
            role: i === 0 ? 'start' : undefined,
            rules: [
              ...(i === 0 ? [zero()] : []),
              how === 'video'
                ? rule('When the video ends', onVideo(), { destination: goTo(next(i)) })
                : how === 'scan'
                  ? rule('Any object moves on', onOther(), { destination: goTo(next(i)) })
                  : rule('Move on', onSeconds(secs(q.seconds)), { destination: goTo(next(i)) }),
            ],
          })
          return
        }
        scenes.push({
          id: id('q' + i),
          name: or(q.name, 'Question'),
          kind: 'question',
          blocks,
          needsContent,
          needsCorrect: !rightOf(a, q),
          role: i === 0 ? 'start' : undefined,
          rules: [...(i === 0 ? [zero()] : []), ...answerRules(q, i)],
        })
      })

      // One result scene, two things it can say, decided the moment the visitor arrives.
      const target = cfg.winMode === 'all' ? questionsOnly(qs).length : whole(cfg.winCount)
      scenes.push({
        id: id('result'),
        name: 'Result',
        kind: 'outro',
        role: 'end',
        blocks: [
          ...(hasDisplay(a) ? [mediaBlock(cfg.resultMedia, 'Result background')] : []),
          ...(cfg.resultAudio ? [AUDIO(cfg.resultAudio)] : []),
        ],
        rules: [
          rule('They made it', onEnter(), {
            condition: cmp('correct', 'GTE', target || 1),
            effects: [reply({ color: 'green', text: or(cfg.resultWin, 'Well done!'), audio: cfg.resultAudio })],
            destination: STAY,
          }),
          rule('They did not make it', onEnter(), {
            effects: [reply({ color: 'grey', text: or(cfg.resultLose, 'Thanks for playing'), audio: cfg.resultAudio })],
            destination: STAY,
          }),
        ],
      })

      return {
        scenes,
        entryId: id('q0'),
        exitId: id('result'),
        variables: [
          { key: 'correct', kind: 'NUMBER', initial: 0 },
          { key: 'wrong', kind: 'NUMBER', initial: 0 },
          { key: 'hints', kind: 'NUMBER', initial: 0 },
        ],
      }
    },
  },

  {
    id: 'scan-discover',
    name: 'Scan & Discover',
    rulesLabel: 'Ending',
    rulesTitle: 'How it ends',
    tagline: 'Each object tells its own story',
    icon: 'scan',
    blurb:
      'The visitor picks up any object and puts it on the Box. It plays that object’s story. Any order, any number of times.',
    example: ['Choose', 'A story per object', 'Done'],
    fields: [
      { key: 'opening', type: 'opening', label: 'While the visitor chooses', help: 'What the screen shows while it waits for an object.' },
      {
        key: 'objects',
        type: 'list',
        label: 'Objects and their stories',
        itemLabel: 'Object',
        columns: [
          { key: 'label', type: 'text', label: 'Story title', placeholder: 'e.g. The Mycenaean vase' },
          { key: 'scan', type: 'scan', label: 'Object that opens it' },
          { key: 'file', type: 'media', label: 'What it shows' },
        ],
      },
      { key: 'closing', type: 'closing', label: 'How this activity ends', settings: true },
    ],
    defaults: () => ({ openingMedia: '', openingAudio: '', objects: [{ label: '', scan: '' }], finish: '', closingMedia: '', closingAudio: '' }),
    summary: (a, cfg) =>
      `${cfg.objects.length} object${cfg.objects.length === 1 ? '' : 's'}, any order · ${
        cfg.finish ? 'ends with ' + esc(scanName(a, cfg.finish)) : '<b class="text-warning">nothing ends it yet</b>'
      }`,
    thumb: (cfg) => cfg.openingMedia,
    build(a, cfg, ns) {
      const id = (x: string) => ns + '-' + x
      const open = (skip: number) =>
        (cfg.objects as Cfg[])
          .map((o, i) => (i === skip ? null : rule(or(o.label, 'Untitled story'), onScan(card(o.scan)), { destination: goTo(id('o' + i)) })))
          .filter((r): r is Rule => !!r)
      const finish = () => (cfg.finish ? [rule('They are done', onScan(card(cfg.finish)), { destination: goTo(id('end')) })] : [])
      return {
        scenes: [
          {
            id: id('start'),
            name: 'Pick something up',
            kind: 'intro',
            role: 'start',
            blocks: hasDisplay(a) ? [mediaBlock(cfg.openingMedia, 'Choose an object')] : [AUDIO(or(cfg.openingAudio, 'welcome audio'))],
            rules: [...open(-1), ...finish()],
          },
          ...(cfg.objects as Cfg[]).map(
            (o, i): Scene => ({
              id: id('o' + i),
              name: or(o.label, 'Untitled story'),
              kind: 'story',
              blocks: rowBlocks(a, o, () => IMAGE(or(o.label, 'story image')), 'story audio'),
              rules: [...open(i), ...finish(), rule('Back to choosing', onSeconds(90), { destination: goTo(id('start')) })],
            }),
          ),
          {
            id: id('end'),
            name: 'Done',
            kind: 'outro',
            role: 'end',
            blocks: hasDisplay(a) ? [mediaBlock(cfg.closingMedia, 'Done')] : [AUDIO(or(cfg.closingAudio, 'closing audio'))],
            rules: [],
          },
        ],
        entryId: id('start'),
        exitId: id('end'),
        variables: [],
      }
    },
  },

  {
    id: 'treasure',
    name: 'Treasure hunt',
    rulesLabel: 'Ending',
    rulesTitle: 'How it ends',
    tagline: 'Objects found in the right order',
    icon: 'route',
    blurb: 'The visitor is sent to find objects one at a time. The right one moves the hunt forward; anything else is politely refused.',
    example: ['Clue ×N', 'Reward'],
    fields: [
      {
        key: 'clues',
        type: 'list',
        label: 'Clues, in order',
        itemLabel: 'Clue',
        columns: [
          { key: 'label', type: 'text', label: 'Clue', placeholder: 'e.g. Find what held the wine' },
          { key: 'scan', type: 'scan', label: 'Object to find' },
          { key: 'file', type: 'media', label: 'What it shows' },
        ],
      },
      { key: 'closing', type: 'closing', label: 'The reward', settings: true },
    ],
    defaults: () => ({ clues: [{ label: '', scan: '' }], closingMedia: '', closingAudio: '' }),
    summary: (_a, cfg) => `${cfg.clues.length} clue${cfg.clues.length === 1 ? '' : 's'}, found in order`,
    thumb: (cfg) => cfg.closingMedia,
    build(a, cfg, ns) {
      const id = (x: string) => ns + '-' + x
      const scenes: Scene[] = []
      ;(cfg.clues as Cfg[]).forEach((c, i) => {
        const last = i + 1 === cfg.clues.length
        scenes.push({
          id: id('c' + i),
          name: 'Clue ' + (i + 1),
          kind: 'story',
          role: i === 0 ? 'start' : undefined,
          blocks: rowBlocks(a, c, () => IMAGE(or(c.label, 'Untitled clue')), 'clue audio'),
          rules: [
            ...(i === 0 ? [rule('Set the count to zero', onEnter(), { effects: [setNum('found', 0)], destination: STAY })] : []),
            rule('Found it', onScan(card(c.scan)), {
              effects: [addNum('found', 1)],
              destination: goTo(last ? id('end') : id('c' + (i + 1))),
            }),
            rule('Not that one', onOther(), { effects: [reply({ color: 'yellow', text: 'Keep looking' })], destination: STAY }),
          ],
        })
      })
      scenes.push({
        id: id('end'),
        name: 'Reward',
        kind: 'outro',
        role: 'end',
        blocks: hasDisplay(a) ? [mediaBlock(cfg.closingMedia, 'Reward')] : [AUDIO(or(cfg.closingAudio, 'reward audio'))],
        rules: [],
      })
      return { scenes, entryId: id('c0'), exitId: id('end'), variables: [{ key: 'found', kind: 'NUMBER', initial: 0 }] }
    },
  },

  {
    id: 'guided',
    name: 'Guided story',
    rulesLabel: 'Pacing',
    rulesTitle: 'How it moves on',
    tagline: 'Told in a fixed order',
    icon: 'play',
    blurb: 'Chapters play one after another. The visitor moves on by scanning a card, or each chapter advances on its own.',
    example: ['Chapter ×N', 'Closing'],
    fields: [
      {
        key: 'chapters',
        type: 'list',
        label: 'Chapters, in order',
        itemLabel: 'Chapter',
        columns: [
          { key: 'label', type: 'text', label: 'Chapter title', placeholder: 'e.g. The clay' },
          { key: 'media', type: 'select', label: 'Shows', options: ['Image', 'Video', 'Illustration'] },
          { key: 'file', type: 'media', label: 'The file' },
        ],
      },
      { key: 'advance', type: 'select', label: 'The visitor moves on by', settings: true, options: ['Scanning a card', 'Waiting — it advances on its own'] },
      { key: 'card', type: 'scan', label: 'Card that moves the story on', settings: true },
      { key: 'seconds', type: 'number', label: 'Seconds each chapter stays up', settings: true },
      { key: 'closing', type: 'closing', label: 'The closing screen', settings: true },
    ],
    defaults: () => ({ chapters: [{ label: '', media: 'Image' }], advance: 'Scanning a card', card: '', seconds: '', closingMedia: '', closingAudio: '' }),
    summary: (a, cfg) =>
      `${cfg.chapters.length} chapter${cfg.chapters.length === 1 ? '' : 's'} · ${
        cfg.advance !== 'Scanning a card'
          ? `each stays ${secs(cfg.seconds)} s`
          : cfg.card
            ? 'moves on with ' + esc(scanName(a, cfg.card))
            : '<b class="text-warning">no card moves it on yet</b>'
      }`,
    thumb: (cfg) => cfg.closingMedia,
    build(a, cfg, ns) {
      const id = (x: string) => ns + '-' + x
      const auto = cfg.advance !== 'Scanning a card'
      const forward = (to: string) =>
        auto
          ? rule('Next chapter', onSeconds(secs(cfg.seconds)), { destination: goTo(to) })
          : rule('Next chapter', onScan(card(cfg.card)), { destination: goTo(to) })
      // The chapter's own file when it has one; otherwise a stand-in of the kind it says it shows.
      const media = (ch: Cfg) =>
        !hasDisplay(a)
          ? AUDIO(or(ch.file, or(ch.label, 'chapter audio')))
          : ch.file
            ? ch.media === 'Illustration' && mediaOf(ch.file)?.kind !== 'VIDEO'
              ? ILLUS(ch.file)
              : mediaBlock(ch.file, '')
            : ch.media === 'Video'
              ? VIDEO(or(ch.label, 'chapter') + '.mp4')
              : ch.media === 'Illustration'
                ? ILLUS(or(ch.label, 'illustration'))
                : IMAGE(or(ch.label, 'chapter image'))
      return {
        scenes: [
          ...(cfg.chapters as Cfg[]).map((ch, i): Scene => {
            const last = i + 1 === cfg.chapters.length
            return {
              id: id('ch' + i),
              name: or(ch.label, 'Untitled chapter'),
              kind: 'story',
              role: i === 0 ? 'start' : undefined,
              blocks: [media(ch)],
              rules: [forward(last ? id('end') : id('ch' + (i + 1)))],
            }
          }),
          {
            id: id('end'),
            name: 'Closing',
            kind: 'outro',
            role: 'end',
            blocks: hasDisplay(a) ? [mediaBlock(cfg.closingMedia, 'Closing')] : [AUDIO(or(cfg.closingAudio, 'closing audio'))],
            rules: [],
          },
        ],
        entryId: id('ch0'),
        exitId: id('end'),
        variables: [],
      }
    },
  },

  {
    id: 'scratch',
    name: 'Start from scratch',
    tagline: 'One empty scene, nothing else',
    icon: 'blank',
    blurb: 'For an activity that does not look like any of the patterns above. You add every scene yourself.',
    example: ['One scene'],
    fields: [{ key: 'opening', type: 'opening', label: 'The scene', help: 'What it shows. Everything else is built in Scenes and rules.' }],
    defaults: () => ({ openingMedia: '', openingAudio: '' }),
    summary: () => 'One scene — build the rest in Scenes and rules',
    thumb: (cfg) => cfg.openingMedia,
    build(a, cfg, ns) {
      const id = (x: string) => ns + '-' + x
      return {
        scenes: [
          {
            id: id('s'),
            name: 'Scene 1',
            kind: 'story',
            role: 'start',
            blocks: hasDisplay(a) ? [mediaBlock(cfg.openingMedia, 'Nothing yet')] : [AUDIO(or(cfg.openingAudio, 'audio'))],
            rules: [],
          },
        ],
        entryId: id('s'),
        exitId: id('s'),
        variables: [],
      }
    },
  },
]

export function template(id: string | null | undefined): Template {
  return TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[TEMPLATES.length - 1]
}

// ─────────────────────────── the activities of the visit ───────────────────────────

export const defaultCfg = (id: string) => template(id).defaults()

/** A new activity goes in at a place in the line, and rebuild() wires the one before into it. */
export function addIsland(a: Authoring, id: string, at = a.islands.length): Island {
  const isl: Island = { key: 'i' + ++a.islandSeq, templateId: id, cfg: defaultCfg(id), next: newLink(id === 'quiz' ? 15 : 10) }
  a.islands.splice(Math.min(at, a.islands.length), 0, isl)
  rebuild(a)
  return isl
}

export function removeIsland(a: Authoring, key: string) {
  const at = a.islands.findIndex((i) => i.key === key)
  if (at >= 0) a.islands.splice(at, 1)
  rebuild(a)
}

export function moveIsland(a: Authoring, key: string, dir: number) {
  const i = a.islands.findIndex((x) => x.key === key)
  const j = i + dir
  if (i < 0 || j < 0 || j >= a.islands.length) return
  ;[a.islands[i], a.islands[j]] = [a.islands[j], a.islands[i]]
  rebuild(a)
}

// ─────────────────────────── building the one flow ───────────────────────────
// Every activity keeps its own start and end scene. Here they are put in a line: the end of one is
// pointed at the start of the next, and the last one really ends.

function linkRule(link: Link | undefined, targetId: string | null, targetName: string): Rule {
  const l = link || newLink()
  const trigger =
    l.how === 'now'
      ? onEnter()
      : l.how === 'video'
        ? onVideo()
        : l.how === 'scan'
          ? onScan(card(l.scan))
          : l.how === 'any'
            ? onOther()
            : onSeconds(secs(l.seconds))
  return { ...rule(targetId ? 'Go on to ' + targetName : 'End the visit', trigger, { destination: targetId ? goTo(targetId) : END }), link: true }
}

export function rebuild(a: Authoring) {
  const scenes: Scene[] = []
  const variables: Variable[] = []
  ruleSeq = 0
  const d = a.details
  const parts: Island[] = []

  // The experience's own start: what an idle Box waits for, and what it shows first.
  const welcome: Block[] = [
    ...(hasDisplay(a) && d.welcomeMedia ? [mediaBlock(d.welcomeMedia, '')] : []),
    ...(d.welcomeAudio ? [AUDIO(d.welcomeAudio)] : []),
    ...(d.welcomeBoxVideo ? [{ type: 'BOX_VIDEO', content: { url: d.welcomeBoxVideo } }] : []),
  ]
  const startScene: Scene = {
    id: 'x-start',
    island: '@start',
    name: 'Start',
    kind: 'intro',
    role: 'start',
    start: true,
    initCard: card(d.startCard),
    blocks: welcome,
    rules: [],
  }
  scenes.push(startScene)

  for (const isl of a.islands) {
    if (!isl.next) isl.next = newLink()
    const built = template(isl.templateId).build(a, { ...isl.cfg, replies: d.replies, customs: d.customs || [] }, isl.key)
    isl.sceneIds = built.scenes.map((sc) => sc.id)
    isl.entryId = built.entryId
    isl.exitId = built.exitId
    parts.push(isl)
    built.scenes.forEach((sc) => scenes.push({ ...sc, island: isl.key }))
    built.variables.forEach((v) => {
      if (!variables.some((x) => x.key === v.key)) variables.push(v)
    })
  }

  // The goodbye, if there is one, then back to idle.
  if (d.goodbye)
    scenes.push({
      id: 'x-end',
      island: '@end',
      name: 'Goodbye',
      kind: 'outro',
      role: 'end',
      blocks: hasDisplay(a) ? [mediaBlock(d.endMedia, 'Thank you')] : [AUDIO(or(d.endAudio, 'goodbye audio'))],
      rules: [rule('Back to idle', onSeconds(secs(d.endSeconds)), { destination: END })],
    })

  // The line: every step hands over to the next one.
  const nextOf = (i: number): [string | null, string] =>
    parts[i + 1]
      ? [parts[i + 1].entryId!, 'activity ' + (i + 2) + ' · ' + template(parts[i + 1].templateId).name]
      : d.goodbye
        ? ['x-end', 'the goodbye']
        : [null, '']
  const [firstId, firstName] = nextOf(-1)
  startScene.rules.push(linkRule(d.startNext, firstId, firstName))
  parts.forEach((isl, i) => {
    const exit = scenes.find((sc) => sc.id === isl.exitId)
    const [to, name] = nextOf(i)
    if (exit) exit.rules.push(linkRule(isl.next, to, name))
  })

  scenes.forEach((sc, i) => {
    sc.position = i
    sc.key = 's' + (i + 1)
    if (sc !== startScene) {
      sc.start = false
      sc.initCard = null
    }
  })

  // Hand changes stand while the forms still generate what they were made on.
  if (a.edits) {
    for (const sc of scenes) {
      const edit = a.edits[sc.id]
      if (!edit) continue
      if (edit.stamp === rulesStamp(sc.rules)) sc.rules = edit.rules.map((r) => ({ ...r }))
      else delete a.edits[sc.id]
    }
    for (const id of Object.keys(a.edits)) if (!scenes.some((sc) => sc.id === id)) delete a.edits[id]
  }
  a.built = { scenes, variables }
}

/**
 * Change a scene's rules by hand. The first change remembers what the forms generated, so the change
 * stands until the form changes that scene again.
 */
export function editRules(a: Authoring, sceneId: string, change: (rules: Rule[]) => void) {
  const sc = a.built.scenes.find((x) => x.id === sceneId)
  if (!sc) return
  if (!a.edits) a.edits = {}
  if (!a.edits[sceneId]) {
    // Rebuild without this scene's edit to get what the forms make of it.
    rebuild(a)
    a.edits[sceneId] = { stamp: rulesStamp(a.built.scenes.find((x) => x.id === sceneId)!.rules), rules: [] }
    a.edits[sceneId].rules = JSON.parse(JSON.stringify(a.built.scenes.find((x) => x.id === sceneId)!.rules))
  }
  change(a.edits[sceneId].rules)
}

// ─────────────────────────── the steps of the visit ───────────────────────────

export const scenesOf = (a: Authoring, key: string) =>
  a.built.scenes.filter((sc) => sc.island === (key === 'start' ? '@start' : key === 'end' ? '@end' : key))

export const LINK_HOW: Record<LinkHow, string> = {
  now: 'Right away',
  time: 'After a few seconds',
  video: 'When the video ends',
  scan: 'When a chosen object is placed',
  any: 'When any object is placed',
}

export interface LinkInfo {
  i: number
  link: Link
  fromName: string
  target: string
  where: string
  hasVideo: boolean
  short: string
  phrase: string
  warn: string
}

/** The hand-over that leaves a step: what it waits for, where it goes, and what is wrong with it. */
export function linkInfo(a: Authoring, fromKey: string): LinkInfo {
  const d = a.details
  const i = fromKey === 'start' ? -1 : a.islands.findIndex((x) => x.key === fromKey)
  const link = (fromKey === 'start' ? d.startNext : a.islands[i]?.next) || newLink()
  const nextIsl = a.islands[i + 1]
  const fromName = fromKey === 'start' ? 'Start' : template(a.islands[i]?.templateId).name
  const target = nextIsl ? template(nextIsl.templateId).name : d.goodbye ? 'the goodbye' : 'the end of the visit'
  const from = fromKey === 'start' ? scenesOf(a, 'start')[0] : a.built.scenes.find((sc) => sc.id === a.islands[i]?.exitId)
  const where = fromKey === 'start' ? 'the welcome' : `the “${esc(from ? from.name : 'last')}” screen`
  const hasVideo = !!(from && from.blocks.some((b) => b.type === 'VIDEO'))
  const n = secs(link.seconds)
  const short =
    link.how === 'now'
      ? 'right away'
      : link.how === 'video'
        ? 'when the video ends'
        : link.how === 'scan'
          ? link.scan
            ? `when ${esc(scanName(a, link.scan))} is placed`
            : 'when an object is placed'
          : link.how === 'any'
            ? 'when any object is placed'
            : `after ${n} s`
  const phrase =
    link.how === 'now'
      ? 'right away'
      : link.how === 'video'
        ? `when the video on ${where} ends`
        : link.how === 'scan'
          ? `when ${link.scan ? chip(scanType(a, link.scan)) : '<b class="text-warning">an object — not chosen yet —</b>'} is placed on the Box`
          : link.how === 'any'
            ? 'when any object is placed on the Box'
            : `after <b>${n} seconds</b> on ${where}`
  const warn =
    link.how === 'video' && !hasVideo
      ? `There is no video on ${where} to wait for.`
      : link.how === 'scan' && !link.scan
        ? 'Choose the object that moves the visitor on.'
        : ''
  return { i, link, fromName, target, where, hasVideo, short, phrase, warn }
}

/** What happens after the last step, in words. */
export const endLine = (a: Authoring) =>
  `the Box goes back to idle and waits for ${
    a.details.startCard ? chip(scanType(a, a.details.startCard)) : '<b class="text-warning">a start object</b>'
  }`

// ─────────────────────────── what is still missing ───────────────────────────

export function reachedFrom(a: Authoring, key: string) {
  const out: { scene: Scene; rule: Rule }[] = []
  for (const sc of a.built.scenes)
    for (const r of sc.rules)
      if (r.destination.type === 'GO_TO' && r.destination.targetSceneKey === key && sc.id !== key) out.push({ scene: sc, rule: r })
  return out
}

export function sceneGaps(a: Authoring, sc: Scene, opts: { skipLinks?: boolean } = {}): string[] {
  const gaps: string[] = []
  if (!reachedFrom(a, sc.id).length && !sc.initCard) {
    gaps.push(sc.start ? 'Nothing starts the visit here' : 'Nothing leads here and it has no object of its own')
  }
  sc.rules.forEach((r) => {
    if (opts.skipLinks && r.link) return
    if (r.trigger.type === 'SCAN' && !r.trigger.cardTypeId && !(sc.needsCorrect && r.label === 'Right answer'))
      gaps.push(`“${r.label}” has no object yet`)
    if (r.trigger.type === 'TIMER_ELAPSED' && !r.trigger.seconds) gaps.push(`“${r.label}” waits zero seconds`)
  })
  if (sc.needsCorrect) gaps.push('No right object chosen')
  if (sc.needsContent) gaps.push(hasDisplay(a) ? 'Nothing to show on the screen' : 'No sound recorded')
  if (sc.needsVideo) gaps.push('Waits for a video that is not there')
  return gaps
}

export const stepGaps = (a: Authoring, key: string) => scenesOf(a, key).flatMap((sc) => sceneGaps(a, sc, { skipLinks: true }))
export const gapCount = (a: Authoring) => a.built.scenes.reduce((n, sc) => n + sceneGaps(a, sc).length, 0)

/** The name of a step, as the "to fix" list and the hand-overs say it. */
export const stepName = (a: Authoring, key: string) =>
  key === 'start' ? 'Start' : key === 'end' ? 'End' : template(a.islands.find((x) => x.key === key)?.templateId).name

/** One line of the "to fix" list: a step's own gap, or the hand-over that leaves it. */
export interface FixRow {
  key: string
  link: boolean
  where: string
  gap: string
}

/** Everything still missing, step by step. */
export function fixRows(a: Authoring): FixRow[] {
  const rows: FixRow[] = []
  for (const k of ['start', ...a.islands.map((x) => x.key), 'end']) {
    for (const g of stepGaps(a, k)) rows.push({ key: k, link: false, where: stepName(a, k), gap: g })
    if (k !== 'end') {
      const l = linkInfo(a, k)
      if (l.warn) rows.push({ key: k, link: true, where: stepName(a, k) + ' → next', gap: l.warn })
    }
  }
  return rows
}

// ─────────────────────────── the quiz, item by item ───────────────────────────

/** How an information item moves on to the next question. */
export const INFO_MOVE: Record<string, string> = {
  time: 'After a few seconds',
  video: 'When the video ends',
  scan: 'When any object is placed on the Box',
}

export function infoSummary(a: Authoring, q: Cfg) {
  const how = infoMoveOn(a, q)
  return how === 'time' ? `moves on after ${secs(q.seconds)}s` : how === 'video' ? 'moves on when the video ends' : 'moves on with any object'
}

/** What a question or information item still needs. */
export function questionGaps(a: Authoring, q: Cfg): string[] {
  const g: string[] = []
  const hasShow = hasDisplay(a) ? !!(q.display || []).length : !!q.audio
  if (isInfo(q)) {
    if (!hasShow) g.push(hasDisplay(a) ? 'Nothing to show' : 'No sound recorded')
    if (infoMoveOn(a, q) === 'video' && !(q.display || []).some((c: Cfg) => c.type === 'VIDEO')) g.push('Waits for a video that is not there')
    return g
  }
  if (usesScreen(a, q)) return screenGaps(q)
  if (!q.correct) g.push('No right object chosen')
  if (!hasShow) g.push(hasDisplay(a) ? 'Nothing to show' : 'No sound recorded')
  return g
}

/** What a question on a ready-made screen still needs. */
export function screenGaps(q: Cfg): string[] {
  const g: string[] = []
  const ans: Cfg[] = q.answers || []
  const p = presetOf(q.screen)!
  if (!String(q.ask || '').trim()) g.push('The question has no words yet')
  if (p.media && !q.screenMedia) g.push(p.media === 'VIDEO' ? 'No video chosen' : 'No picture chosen')
  if (ans.some((x) => !String(x.text || '').trim() && !x.media)) g.push('An answer has no words yet')
  if (ans.some((x) => !x.scan)) g.push('An answer has no object yet')
  const objs = ans.map((x) => x.scan).filter(Boolean)
  if (new Set(objs).size < objs.length) g.push('Two answers use the same object')
  if (!(typeof q.right === 'number' && q.right >= 0 && q.right < ans.length)) g.push('No right answer chosen')
  return g
}

// ─────────────────────────── before it goes out ───────────────────────────

/** Every object type the built visit reacts to: the start object and every scan rule. */
export function usedScanTypes(a: Authoring): string[] {
  const used = new Set<string>()
  for (const s of a.built.scenes) {
    if (s.initCard) used.add(s.initCard)
    for (const r of s.rules) if (r.trigger.type === 'SCAN' && r.trigger.cardTypeId) used.add(r.trigger.cardTypeId)
  }
  return [...used]
}

export interface Check {
  ok: boolean
  text: string
}

/**
 * The checks run before publishing, in plain words. `owned` counts the museum's physical objects by
 * type, when known, so a visit that needs an object nobody has is caught.
 */
export function validate(a: Authoring, owned?: Map<string, number>): Check[] {
  const out: Check[] = []
  const scenes = a.built.scenes
  const ids = new Set(scenes.map((s) => s.id))
  const check = (ok: boolean, yes: string, no: string) => out.push({ ok, text: ok ? yes : no })

  check(!!a.details.startCard, 'An object starts the experience', 'No object starts the experience — nobody could begin')
  const unbound = scenes.find((s) => s.rules.some((r) => r.trigger.type === 'SCAN' && !r.trigger.cardTypeId))
  check(
    !unbound,
    'Every rule that waits for an object has one chosen',
    `A rule in “${unbound?.name}” waits for an object that has not been chosen`,
  )
  const noCorrect = scenes.find((s) => s.needsCorrect)
  check(!noCorrect, 'Every question has a right object', `“${noCorrect?.name}” has no right object`)
  const noContent = scenes.find((s) => s.needsContent)
  check(
    !noContent,
    hasDisplay(a) ? 'Every question has something on the screen' : 'Every question has its recording',
    `“${noContent?.name}” has nothing for the visitor`,
  )
  const dangling = scenes.find((s) =>
    s.rules.some((r) => r.destination.type === 'GO_TO' && !ids.has(r.destination.targetSceneKey ?? '')),
  )
  check(!dangling, 'Every rule points at a scene that exists', `A rule in “${dangling?.name}” points at a scene that is gone`)
  check(
    scenes.some((s) => s.rules.some((r) => r.destination.type === 'END')),
    'The visit reaches an end',
    'Nothing ends the visit',
  )
  const zeroTimer = scenes.find((s) => s.rules.some((r) => r.trigger.type === 'TIMER_ELAPSED' && !r.trigger.seconds))
  check(!zeroTimer, 'Every wait has a length', `A rule in “${zeroTimer?.name}” waits zero seconds`)
  if (owned) {
    const missing = usedScanTypes(a).find((id) => !owned.get(id))
    check(!missing, 'The objects it needs are in your inventory', `You own no ${scanName(a, missing)}`)
  }
  return out
}

// ─────────────────────────── rules in plain language ───────────────────────────

export const OPS: Record<string, string> = { GTE: '≥', LTE: '≤', GT: '>', LT: '<', EQ: '=', NEQ: '≠' }
export const SCENE_COLOR: Record<string, string> = {
  intro: '#4c1d8b',
  story: '#b05fd6',
  question: '#2d5aa0',
  feedback: '#9a6200',
  outro: '#0f7a6e',
}

export function conditionText(c: Condition | null): string {
  if (!c) return ''
  if (c.type === 'VAR_CMP') return `<span class="font-mono font-bold">${esc(c.var)}</span> ${OPS[c.op] ?? ''} ${esc(String(c.value))}`
  return `<span class="font-mono font-bold">${esc(c.var)}</span> is ${c.value ? 'on' : 'off'}`
}

export function effectText(a: Authoring, e: Effect): string {
  if (e.type === 'SET_NUMBER') return `set <span class="font-mono font-bold">${esc(e.var)}</span> to ${esc(String(e.value))}`
  if (e.type === 'ADD_NUMBER') return `add <b>${esc(String(e.amount))}</b> to <span class="font-mono font-bold">${esc(e.var)}</span>`
  if (e.type === 'SET_FLAG') return `turn <span class="font-mono font-bold">${esc(e.var)}</span> ${e.value ? 'on' : 'off'}`
  if (e.type === 'BOX_SCREEN') return `show “${esc(e.text)}” on the Box`
  if (e.type === 'BOX_AUDIO') return `play ${esc(mediaName(e.url))}`
  const bits: string[] = []
  if (hasDisplay(a)) bits.push(e.media ? `show ${esc(mediaName(e.media))}` : `${COLORS.find((c) => c.id === e.color)?.name.toLowerCase() || ''} panel`)
  if (e.audio) bits.push(`play ${esc(mediaName(e.audio))}`)
  return `reply “${esc(e.text)}”${bits.length ? ' (' + bits.join(', ') + ')' : ''}`
}

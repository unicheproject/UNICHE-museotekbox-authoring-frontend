/**
 * The authoring templates offered by the New Experience wizard.
 *
 * A template is not the shape of the whole experience: it is a ready-made island of scenes and
 * rules that gets stamped onto the canvas, which the author then edits freely. Each one answers
 * three things before it is applied — what it is in one sentence (`blurb`), the path it will
 * create (`example`), and the handful of plain questions it needs answered (`fields`).
 *
 * `buildDocument()` at the bottom turns the answers into ordinary Scenes, Rules and Variables —
 * what the review step draws out before anything is created, and what the author will go on to
 * edit. The backend has no endpoint for them yet, so the built document lives on the client.
 */

/** Names of the lucide icons the wizard draws for each template; mapped in TemplateIcon.vue. */
export type TemplateIconName = 'scan' | 'quiz' | 'route' | 'play' | 'blank'

export type ContentKind = 'TEXT' | 'IMAGE' | 'VIDEO'

/** One text / image / video row the author added to a quiz question. */
export interface QuestionContent {
  type: ContentKind
  /** The text shown on the Display, or the file for an image or a video. */
  name: string
  /** Videos only: the scan object that plays it, empty when it plays with the question. */
  playCard: string
}

export interface QuestionAnswer {
  label: string
  /** Id of the scan object that stands for this answer, empty until one is chosen. */
  card: string
}

export interface QuestionRow {
  name: string
  content: QuestionContent[]
  /** Index into `answers`; -1 while the author has not marked one, which is a legitimate state. */
  correct: number
  answers: QuestionAnswer[]
}

/** A row of a `list` field — one value per declared column. */
export type ListRow = Record<string, string>

export type FieldValue = string | boolean | ListRow[] | QuestionRow[]

/** The answers given to one template's fields, keyed by field key. */
export type TemplateConfig = Record<string, FieldValue>

export interface ListColumn {
  key: string
  type: 'text' | 'scan' | 'select'
  label: string
  placeholder?: string
  /** `select` columns only. */
  options?: string[]
}

interface FieldBase {
  key: string
  label: string
  /**
   * Settings sit in their own grid under the main questions: they are the dials of the pattern
   * (which card ends the visit, how long a chapter stays up), not the substance of it.
   */
  settings?: boolean
}

export type TemplateField =
  | (FieldBase & { type: 'text'; placeholder?: string; value: string })
  | (FieldBase & { type: 'number'; value: string })
  | (FieldBase & { type: 'select'; options: string[]; value: string })
  | (FieldBase & { type: 'scan'; value: string })
  | (FieldBase & { type: 'toggle'; value: boolean })
  | (FieldBase & { type: 'list'; itemLabel: string; columns: ListColumn[]; value: ListRow[] })
  | (FieldBase & { type: 'questions'; value: QuestionRow[] })

export interface ExperienceTemplate {
  id: string
  name: string
  tagline: string
  icon: TemplateIconName
  badge?: string
  blurb: string
  /** The path the template will create, shown before it is applied. */
  example: string[]
  fields: TemplateField[]
}

/** A dial that needs the full width of the settings grid rather than half of it. */
export function isWideField(field: TemplateField): boolean {
  return ['toggle', 'list', 'questions', 'text'].includes(field.type)
}

export const EXPERIENCE_TEMPLATES: ExperienceTemplate[] = [
  {
    id: 'scan-discover',
    name: 'Scan & Discover',
    tagline: 'Each object tells its own story',
    icon: 'scan',
    badge: 'Most used',
    blurb:
      'The visitor picks up any object and scans it. The Box plays its audio and the Display shows its story. Any order, any number of times.',
    example: ['Welcome', 'Story per object', 'Thank you'],
    fields: [
      {
        key: 'objects',
        type: 'list',
        label: 'Objects',
        itemLabel: 'Object',
        columns: [
          { key: 'label', type: 'text', label: 'Story title', placeholder: 'e.g. The Mycenaean vase' },
          { key: 'scan', type: 'scan', label: 'Object that opens it' },
        ],
        value: [{ label: '', scan: '' }],
      },
      { settings: true, key: 'finish', type: 'scan', label: 'Card that ends the visit', value: '' },
    ],
  },

  {
    id: 'quiz',
    name: 'Quiz',
    tagline: 'Questions answered by scanning',
    icon: 'quiz',
    blurb:
      'Each question is shown on the Display. The visitor answers by scanning a coloured card. The score is kept and a result screen closes the game.',
    example: ['Question ×N', 'Right / wrong', 'Result'],
    fields: [
      {
        key: 'questions',
        type: 'questions',
        label: 'Questions',
        value: [{ name: '', content: [], correct: -1, answers: [] }],
      },
    ],
  },

  {
    id: 'treasure',
    name: 'Treasure hunt',
    tagline: 'Objects found in the right order',
    icon: 'route',
    blurb:
      'The visitor is sent to find objects one at a time. Scanning the right one moves the hunt forward; anything else is politely refused.',
    example: ['Briefing', 'Clue ×N', 'Reward'],
    fields: [
      {
        key: 'clues',
        type: 'list',
        label: 'Clues, in order',
        itemLabel: 'Clue',
        columns: [
          { key: 'label', type: 'text', label: 'Clue', placeholder: 'e.g. Find what held the wine' },
          { key: 'scan', type: 'scan', label: 'Object to find' },
        ],
        value: [{ label: '', scan: '' }],
      },
      { settings: true, key: 'startCard', type: 'scan', label: 'Card that starts the hunt', value: '' },
    ],
  },

  {
    id: 'guided',
    name: 'Guided presentation',
    tagline: 'A story told in a fixed order',
    icon: 'play',
    blurb:
      'Video, images and text play one after another. The visitor moves on by scanning a card, or the scene advances on its own.',
    example: ['Opening video', 'Chapter ×N', 'Closing'],
    fields: [
      {
        key: 'chapters',
        type: 'list',
        label: 'Chapters, in order',
        itemLabel: 'Chapter',
        columns: [
          { key: 'label', type: 'text', label: 'Chapter title', placeholder: 'e.g. The clay' },
          { key: 'media', type: 'select', label: 'Shows', options: ['Video', 'Image', 'Text'] },
        ],
        value: [{ label: '', media: 'Image' }],
      },
      {
        settings: true,
        key: 'advance',
        type: 'select',
        label: 'The visitor moves on by',
        options: ['Scanning a card', 'Waiting — it advances on its own'],
        value: 'Scanning a card',
      },
      { settings: true, key: 'card', type: 'scan', label: 'Card that moves the story on', value: '' },
      {
        settings: true,
        key: 'seconds',
        type: 'number',
        label: 'Seconds each chapter stays up, when it advances on its own',
        value: '',
      },
    ],
  },

  {
    id: 'scratch',
    name: 'Start from scratch',
    tagline: 'One empty scene, nothing else',
    icon: 'blank',
    blurb:
      'For an experience that does not look like any of the patterns above. You add every scene and rule yourself.',
    example: ['Start scene'],
    fields: [],
  },
]

export function findTemplate(id: string | null): ExperienceTemplate | undefined {
  return EXPERIENCE_TEMPLATES.find((t) => t.id === id)
}

/**
 * The answers a freshly picked template starts with: structure and placeholders only. Nothing is
 * filled in for the author — not a sample row's contents, not a preselected correct answer, not a
 * default number of seconds. Whatever is still missing is reported later as a gap.
 */
export function defaultConfig(template: ExperienceTemplate): TemplateConfig {
  const config: TemplateConfig = {}
  for (const field of template.fields) {
    config[field.key] =
      field.type === 'list' || field.type === 'questions'
        ? (JSON.parse(JSON.stringify(field.value)) as FieldValue)
        : field.value
  }
  return config
}

/** A blank row for a `list` field, with `select` columns on their first option. */
export function emptyRow(field: Extract<TemplateField, { type: 'list' }>): ListRow {
  const row: ListRow = {}
  for (const column of field.columns) {
    row[column.key] = column.type === 'select' ? (column.options?.[0] ?? '') : ''
  }
  return row
}

export function emptyQuestion(): QuestionRow {
  return { name: '', content: [], correct: -1, answers: [] }
}

/** A stand-in for generated output, so a half-filled draft still reads. */
export function or(value: string, fallback: string): string {
  return value.trim() || fallback
}

/* ───────────────── The rule vocabulary ─────────────────
   Straight out of the Scene Rules Workbench spec. A rule is one sentence: one trigger, an optional
   condition, ordered effects and one destination. The vocabulary is closed — the author picks from
   it and never writes an expression. Of the rules on the current scene whose trigger matches, the
   ones whose condition is false are dropped and the FIRST one left runs: position is semantics. */

export type Trigger =
  | { type: 'SCAN'; cardTypeId: string | null }
  | { type: 'TIMER_ELAPSED'; seconds: number }
  | { type: 'SCENE_ENTERED' }
  | { type: 'SESSION_STARTED' }
  | { type: 'VIDEO_ENDED' }

export type CompareOp = 'GTE' | 'LTE' | 'GT' | 'LT' | 'EQ' | 'NEQ'

export const COMPARE_SYMBOL: Record<CompareOp, string> = {
  GTE: '≥',
  LTE: '≤',
  GT: '>',
  LT: '<',
  EQ: '=',
  NEQ: '≠',
}

export type Condition =
  | { type: 'VAR_CMP'; var: string; op: CompareOp; value: number }
  | { type: 'FLAG_IS'; var: string; value: boolean }

export type Effect =
  | { type: 'SET_NUMBER'; var: string; value: number }
  | { type: 'ADD_NUMBER'; var: string; amount: number }
  | { type: 'SET_FLAG'; var: string; value: boolean }
  | { type: 'BOX_SCREEN'; text: string }

export type Destination =
  | { type: 'GO_TO'; targetSceneKey: string | null }
  | { type: 'STAY' }
  | { type: 'END' }

export interface Rule {
  key: string
  label: string
  trigger: Trigger
  condition: Condition | null
  effects: Effect[]
  destination: Destination
}

/** The block types the Display knows about. */
export type Block =
  | { type: 'TEXT'; content: { text: string; fontSize: number; bold: boolean } }
  | { type: 'IMAGE'; content: { url: string; align: string } }
  | { type: 'VIDEO'; content: { url: string } }
  | { type: 'QUIZ'; content: { question: string; options: { key: string; label: string }[] } }

export type SceneKind = 'intro' | 'story' | 'question' | 'feedback' | 'outro'

export interface Scene {
  /** Internal handle used by destinations while the document is being built. */
  id: string
  /** Monotonic key across the document, never reused. */
  key: string
  name: string
  kind: SceneKind
  start: boolean
  /** The card that wakes an idle Box on this scene; only meaningful where nothing leads here. */
  initCard: string | null
  blocks: Block[]
  rules: Rule[]
  /** Carried through from the answers so the review can point at what is still missing. */
  needsAnswers?: boolean
  needsCorrect?: boolean
}

export interface Variable {
  key: string
  kind: 'NUMBER' | 'FLAG'
  initial: number
}

export interface BuiltDocument {
  scenes: Scene[]
  variables: Variable[]
}

// ── builders ──────────────────────────────────────────────────────────────

const scan = (cardTypeId: string | null): Trigger => ({ type: 'SCAN', cardTypeId })
const seconds = (value: number): Trigger => ({ type: 'TIMER_ELAPSED', seconds: value })
const sessionStarted = (): Trigger => ({ type: 'SESSION_STARTED' })
const videoEnded = (): Trigger => ({ type: 'VIDEO_ENDED' })

const setNumber = (name: string, value: number): Effect => ({ type: 'SET_NUMBER', var: name, value })
const addNumber = (name: string, amount: number): Effect => ({ type: 'ADD_NUMBER', var: name, amount })
const boxSays = (text: string): Effect => ({ type: 'BOX_SCREEN', text })

const goTo = (targetSceneKey: string): Destination => ({ type: 'GO_TO', targetSceneKey })
const STAY: Destination = { type: 'STAY' }
const END: Destination = { type: 'END' }

const TEXT = (text: string, big = false): Block => ({
  type: 'TEXT',
  content: { text, fontSize: big ? 28 : 18, bold: big },
})
const IMAGE = (url: string): Block => ({ type: 'IMAGE', content: { url, align: 'center' } })
const VIDEO = (url: string): Block => ({ type: 'VIDEO', content: { url } })

/** A card the author has not chosen yet stays null — the normal mid-draft state, not an error. */
const cardOf = (value: string): string | null => value || null
const numberOf = (value: string): number => Number(value) || 0

/** A scene as the builders write it, before keys and positions are assigned. */
type DraftScene = Omit<Scene, 'key' | 'start' | 'initCard'> &
  Partial<Pick<Scene, 'start' | 'initCard'>>

interface BuildResult {
  scenes: DraftScene[]
  variables: Variable[]
}

type Builder = (config: TemplateConfig, counter: () => string) => BuildResult

const rows = (value: FieldValue | undefined): ListRow[] => (Array.isArray(value) ? (value as ListRow[]) : [])
const text = (value: FieldValue | undefined): string => (typeof value === 'string' ? value : '')

const BUILDERS: Record<string, Builder> = {
  'scan-discover': (config, key) => {
    const objects = rows(config.objects)
    const rule = (label: string, trigger: Trigger, destination: Destination): Rule => ({
      key: key(),
      label,
      trigger,
      condition: null,
      effects: [],
      destination,
    })
    // Any other object can be scanned straight from any story — that is what "any order" means.
    // Mapped before it is filtered: the scene id is the object's own position in the list.
    const openers = (skip: number) =>
      objects
        .map((object, index) =>
          index === skip
            ? null
            : rule(or(object.label, 'Untitled story'), scan(cardOf(object.scan)), goTo(`o${index}`)),
        )
        .filter((rule): rule is Rule => rule !== null)
    const finish = () => rule('Finish', scan(cardOf(text(config.finish))), goTo('thanks'))

    return {
      scenes: [
        {
          id: 'welcome',
          name: 'Welcome',
          kind: 'intro',
          start: true,
          blocks: [TEXT('Pick up an object and scan it', true)],
          rules: [...openers(-1), finish()],
        },
        ...objects.map((object, index) => ({
          id: `o${index}`,
          name: or(object.label, 'Untitled story'),
          kind: 'story' as SceneKind,
          blocks: [IMAGE(or(object.label, 'image')), TEXT(or(object.label, 'Untitled story'))],
          rules: [
            ...openers(index),
            finish(),
            rule('Back to the start', seconds(90), goTo('welcome')),
          ],
        })),
        {
          id: 'thanks',
          name: 'Thank you',
          kind: 'outro',
          blocks: [TEXT('Thank you for visiting', true)],
          rules: [rule('End', seconds(15), END)],
        },
      ],
      variables: [],
    }
  },

  /* Everything a question needs lives on the question. What the template generates:
     · question 1 is the start scene;
     · one rule per answer card, because the vocabulary binds one card per rule and has no
       "anything else" trigger;
     · its own Correct / Not quite screen per question, because a destination is fixed and a shared
       screen could only ever lead back to one question;
     · a video with a card of its own becomes a scene that points back at itself, so scanning the
       card again restarts it from the top. */
  quiz: (config, key) => {
    const questions = Array.isArray(config.questions) ? (config.questions as QuestionRow[]) : []
    const scenes: DraftScene[] = []
    const after = (index: number) => (index + 1 < questions.length ? `q${index + 1}` : 'result')

    questions.forEach((question, index) => {
      const title = or(question.name, `Question ${index + 1}`)
      const rules: Rule[] = []

      // The session opens on the first question, so that is where the counters are set. STAY: it
      // changes values without moving anybody.
      if (index === 0) {
        rules.push({
          key: key(),
          label: 'Set up the game',
          trigger: sessionStarted(),
          condition: null,
          effects: [setNumber('score', 0), setNumber('correct', 0), setNumber('wrong', 0)],
          destination: STAY,
        })
      }

      question.answers.forEach((answer, at) => {
        const label = or(answer.label, `Answer ${at + 1}`)
        rules.push(
          at === question.correct
            ? {
                key: key(),
                label: `Correct — ${label}`,
                trigger: scan(cardOf(answer.card)),
                condition: null,
                effects: [addNumber('score', 1), addNumber('correct', 1)],
                destination: goTo(`right${index}`),
              }
            : {
                key: key(),
                label: `Wrong — ${label}`,
                trigger: scan(cardOf(answer.card)),
                condition: null,
                effects: [addNumber('wrong', 1)],
                destination: goTo(`wrong${index}`),
              },
        )
      })

      // A video the visitor plays themselves lives in its own scene, offered after the answers so
      // it can never shadow one.
      const played = question.content.filter((c) => c.type === 'VIDEO' && c.playCard)
      played.forEach((content, at) => {
        rules.push({
          key: key(),
          label: `Play ${or(content.name, 'the video')}`,
          trigger: scan(cardOf(content.playCard)),
          condition: null,
          effects: [],
          destination: goTo(`v${index}-${at}`),
        })
      })

      scenes.push({
        id: `q${index}`,
        name: title,
        kind: 'question',
        start: index === 0,
        needsAnswers: question.answers.length === 0,
        needsCorrect: question.answers.length > 0 && question.correct < 0,
        blocks: [
          ...question.content
            .filter((c) => !(c.type === 'VIDEO' && c.playCard))
            .map((c) =>
              c.type === 'TEXT'
                ? TEXT(or(c.name, 'New text'))
                : c.type === 'VIDEO'
                  ? VIDEO(or(c.name, 'video'))
                  : IMAGE(or(c.name, 'image')),
            ),
          {
            type: 'QUIZ',
            content: {
              question: '',
              options: question.answers.map((answer, at) => ({
                key: answer.card,
                label: or(answer.label, `Answer ${at + 1}`),
              })),
            },
          },
        ],
        rules,
      })

      played.forEach((content, at) => {
        scenes.push({
          id: `v${index}-${at}`,
          name: `${or(content.name, 'Video')} · ${title}`,
          kind: 'story',
          blocks: [VIDEO(or(content.name, 'video'))],
          rules: [
            // GO_TO its own scene is a re-entry, and a re-entry starts it again.
            {
              key: key(),
              label: 'Play it from the start again',
              trigger: scan(cardOf(content.playCard)),
              condition: null,
              effects: [],
              destination: goTo(`v${index}-${at}`),
            },
            {
              key: key(),
              label: 'When the video ends',
              trigger: videoEnded(),
              condition: null,
              effects: [],
              destination: goTo(`q${index}`),
            },
          ],
        })
      })

      scenes.push({
        id: `right${index}`,
        name: `Correct! · ${title}`,
        kind: 'feedback',
        blocks: [TEXT('Correct!', true)],
        rules: [
          {
            key: key(),
            label: 'Next question',
            trigger: seconds(3),
            condition: null,
            effects: [],
            destination: goTo(after(index)),
          },
        ],
      })

      // Only a correct answer moves the visitor on. A wrong one says so and hands the question
      // back, so the message is a message and not a penalty.
      scenes.push({
        id: `wrong${index}`,
        name: `Not quite · ${title}`,
        kind: 'feedback',
        blocks: [TEXT('Not quite', true)],
        rules: [
          {
            key: key(),
            label: 'Back to the question',
            trigger: seconds(3),
            condition: null,
            effects: [],
            destination: goTo(`q${index}`),
          },
        ],
      })
    })

    scenes.push({
      id: 'result',
      name: 'Result',
      kind: 'outro',
      blocks: [TEXT('You scored {score} points', true)],
      rules: [
        {
          key: key(),
          label: 'End the session',
          trigger: seconds(15),
          condition: null,
          effects: [boxSays('Thank you')],
          destination: END,
        },
      ],
    })

    return {
      scenes,
      variables: [
        { key: 'score', kind: 'NUMBER', initial: 0 },
        { key: 'correct', kind: 'NUMBER', initial: 0 },
        { key: 'wrong', kind: 'NUMBER', initial: 0 },
      ],
    }
  },

  treasure: (config, key) => {
    const clues = rows(config.clues)
    const startCard = text(config.startCard)
    const scenes: DraftScene[] = [
      {
        id: 'brief',
        name: 'Briefing',
        kind: 'intro',
        start: true,
        initCard: cardOf(startCard),
        blocks: [TEXT('Find the objects, one at a time', true)],
        rules: [
          {
            key: key(),
            label: 'Set up the hunt',
            trigger: sessionStarted(),
            condition: null,
            effects: [setNumber('found', 0)],
            destination: STAY,
          },
          {
            key: key(),
            label: 'Start',
            trigger: scan(cardOf(startCard)),
            condition: null,
            effects: [],
            destination: goTo('c0'),
          },
        ],
      },
    ]

    clues.forEach((clue, index) => {
      const last = index + 1 === clues.length
      scenes.push({
        id: `c${index}`,
        name: `Clue ${index + 1}`,
        kind: 'story',
        blocks: [TEXT(or(clue.label, 'Untitled clue'), true), TEXT(`Found {found} of ${clues.length}`)],
        rules: [
          {
            key: key(),
            label: 'Found it',
            trigger: scan(cardOf(clue.scan)),
            condition: null,
            effects: [addNumber('found', 1)],
            destination: goTo(last ? 'reward' : `c${index + 1}`),
          },
          // The vocabulary has no "anything else", so every other object is refused explicitly.
          ...clues
            .filter((other, at) => at !== index && other.scan)
            .map((other) => ({
              key: key(),
              label: 'Not this one',
              trigger: scan(cardOf(other.scan)),
              condition: null,
              effects: [boxSays('Keep looking')],
              destination: STAY,
            })),
        ],
      })
    })

    scenes.push({
      id: 'reward',
      name: 'Reward',
      kind: 'outro',
      blocks: [TEXT('You found them all', true)],
      rules: [
        { key: key(), label: 'End', trigger: seconds(10), condition: null, effects: [], destination: END },
      ],
    })

    return { scenes, variables: [{ key: 'found', kind: 'NUMBER', initial: 0 }] }
  },

  guided: (config, key) => {
    const chapters = rows(config.chapters)
    const auto = text(config.advance) !== 'Scanning a card'
    const forward = (to: string): Rule => ({
      key: key(),
      label: 'Next chapter',
      trigger: auto ? seconds(numberOf(text(config.seconds))) : scan(cardOf(text(config.card))),
      condition: null,
      effects: [],
      destination: goTo(to),
    })

    return {
      scenes: [
        {
          id: 'open',
          name: 'Opening video',
          kind: 'intro',
          start: true,
          blocks: [VIDEO('opening.mp4')],
          rules: [
            {
              key: key(),
              label: 'When the video ends',
              trigger: videoEnded(),
              condition: null,
              effects: [],
              destination: goTo('ch0'),
            },
          ],
        },
        ...chapters.map((chapter, index) => {
          const last = index + 1 === chapters.length
          const title = or(chapter.label, 'Untitled chapter')
          return {
            id: `ch${index}`,
            name: title,
            kind: 'story' as SceneKind,
            blocks: [
              chapter.media === 'Video'
                ? VIDEO(`${title}.mp4`)
                : chapter.media === 'Text'
                  ? TEXT(title, true)
                  : IMAGE(title),
            ],
            rules: [forward(last ? 'close' : `ch${index + 1}`)],
          }
        }),
        {
          id: 'close',
          name: 'Closing',
          kind: 'outro',
          blocks: [TEXT('The end', true)],
          rules: [
            { key: key(), label: 'End', trigger: seconds(10), condition: null, effects: [], destination: END },
          ],
        },
      ],
      variables: [],
    }
  },

  scratch: () => ({
    scenes: [
      { id: 'start', name: 'Start scene', kind: 'intro', start: true, blocks: [], rules: [] },
    ],
    variables: [],
  }),
}

/**
 * Turn the answers into ordinary Scenes, Rules and Variables — what the author will edit after the
 * wizard, and what the review step draws out before anything is created.
 */
export function buildDocument(templateId: string | null, config: TemplateConfig): BuiltDocument {
  const builder = templateId ? BUILDERS[templateId] : undefined
  if (!builder) return { scenes: [], variables: [] }

  let ruleSeq = 0
  const built = builder(config, () => `r${++ruleSeq}`)

  // Keys are monotonic across the document and never reused; the build id stays the internal handle.
  const scenes: Scene[] = built.scenes.map((scene, index) => ({
    ...scene,
    start: Boolean(scene.start),
    initCard: scene.initCard ?? null,
    key: `s${index + 1}`,
  }))

  // Exactly one start scene, per the spec.
  if (scenes.length && !scenes.some((scene) => scene.start)) scenes[0].start = true

  // initCard only means anything on a scene nothing else leads to.
  const reached = new Set(
    scenes.flatMap((scene) =>
      scene.rules
        .filter((rule) => rule.destination.type === 'GO_TO')
        .map((rule) => (rule.destination as { targetSceneKey: string | null }).targetSceneKey),
    ),
  )
  for (const scene of scenes) {
    if (reached.has(scene.id) && !scene.start) scene.initCard = null
  }

  return { scenes, variables: built.variables }
}

/** Which rules lead into a scene — derived, never stored. */
export function reachedFrom(document: BuiltDocument, sceneId: string): Rule[] {
  const inbound: Rule[] = []
  for (const scene of document.scenes) {
    for (const rule of scene.rules) {
      if (
        rule.destination.type === 'GO_TO' &&
        rule.destination.targetSceneKey === sceneId &&
        scene.id !== sceneId
      ) {
        inbound.push(rule)
      }
    }
  }
  return inbound
}

/** What is still missing on a scene. The same list the pre-publish checks total up. */
export function sceneGaps(document: BuiltDocument, scene: Scene): string[] {
  const gaps: string[] = []
  // A scene nothing leads to is reachable only by its own card — and the start scene is the
  // extreme case: without a card, an idle Box cannot be woken at all.
  if (!reachedFrom(document, scene.id).length && !scene.initCard) {
    gaps.push(
      scene.start
        ? 'No card starts the experience'
        : 'Nothing leads here and it has no card of its own',
    )
  }
  for (const rule of scene.rules) {
    if (rule.trigger.type === 'SCAN' && !rule.trigger.cardTypeId) {
      gaps.push(`“${rule.label}” has no card yet`)
    }
    if (rule.trigger.type === 'TIMER_ELAPSED' && !rule.trigger.seconds) {
      gaps.push(`“${rule.label}” waits zero seconds`)
    }
  }
  if (scene.needsAnswers) gaps.push('This question has no answers yet')
  if (scene.needsCorrect) gaps.push('No answer is marked correct')
  return gaps
}

/** Physical inventory check — a publishing gate, so it is surfaced here already. */
export function usedScanObjects(document: BuiltDocument): string[] {
  const used = new Set<string>()
  for (const scene of document.scenes) {
    if (scene.initCard) used.add(scene.initCard)
    for (const rule of scene.rules) {
      if (rule.trigger.type === 'SCAN' && rule.trigger.cardTypeId) used.add(rule.trigger.cardTypeId)
    }
  }
  return [...used]
}

export function sceneNameOf(document: BuiltDocument, sceneId: string | null): string {
  if (!sceneId) return '—'
  return document.scenes.find((scene) => scene.id === sceneId)?.name ?? sceneId
}

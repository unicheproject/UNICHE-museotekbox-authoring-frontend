import {
  createKeyAllocator,
  type BlockDto,
  type BlockType,
  type ConditionDto,
  type ConditionOp,
  type EffectDto,
  type ExperienceDto,
  type ExperienceWriteRequest,
  type JsonValue,
  type RuleDto,
  type ScanObjectTypeDto,
  type SceneDto,
  type TriggerDto,
} from '@/api/museotekBox'
import {
  OPS,
  mediaOf,
  newDetails,
  type Authoring,
  type Condition,
  type Destination,
  type Details,
  type Effect,
  type Island,
  type SceneEdit,
  type Rule,
  type ScanType,
  type Trigger,
} from './engine'

/**
 * How an experience is written to, and read back from, the backend's experience document.
 *
 * A save sends both halves together:
 *  · the flow — what the author built on the page (details and activities), stored as-is by the
 *    backend and read back to reopen the page;
 *  · the graph the engine generated from it — variables, scenes, blocks and rules — which is what
 *    the Box plays.
 */

const FLOW_SCHEMA = 1

interface FlowContent {
  details: Details
  islands: Pick<Island, 'key' | 'templateId' | 'cfg' | 'next'>[]
  islandSeq: number
  /** Hand changes from Scenes and rules (see SceneEdit). */
  edits?: Record<string, SceneEdit>
}

/** Object types have no colour of their own, so every chip gets the same neutral dot. */
const SWATCH = '#9ca3af'

/** The museum's object types, as the authoring screens pick them. Rules refer to a type. */
export function scanTypesFrom(types: ScanObjectTypeDto[]): ScanType[] {
  return types.map((t) => ({ id: String(t.id), name: t.name, swatch: SWATCH }))
}

// ─────────────────────────── reading ───────────────────────────

/** The page as the author left it, or null for an experience never saved. */
export function readFlow(doc: ExperienceDto): Pick<Authoring, 'details' | 'islands' | 'islandSeq' | 'edits'> | null {
  if (!doc.flow || doc.flow.schemaVersion !== FLOW_SCHEMA) return null
  const saved = doc.flow.content as unknown as Partial<FlowContent>
  const islands = Array.isArray(saved.islands) ? saved.islands.map((i) => ({ ...i })) : []
  // The counter only ever moves forward, so a removed activity's key is never handed out again.
  const highest = islands.reduce((max, i) => Math.max(max, Number.parseInt(String(i.key).slice(1), 10) || 0), 0)
  return {
    // Where it plays is the backend's own field; it wins over whatever the flow remembers.
    details: newDetails({ ...(saved.details ?? {}), ...(doc.output ? { output: doc.output } : {}) }),
    islands,
    islandSeq: Math.max(saved.islandSeq || 0, highest),
    edits: saved.edits && typeof saved.edits === 'object' ? JSON.parse(JSON.stringify(saved.edits)) : {},
  }
}

// ─────────────────────────── writing ───────────────────────────

/**
 * The block types the backend knows, and the field of each that holds its file. A ready-made
 * question screen keeps its words, answers and picture or video as they are.
 */
const STORED_TYPE: Record<string, BlockType> = {
  TEXT: 'TEXT',
  IMAGE: 'IMAGE',
  ILLUSTRATION: 'ILLUSTRATION',
  VIDEO: 'VIDEO',
  SCREEN: 'SCREEN',
  AUDIO: 'AUDIO',
  BOX_VIDEO: 'BOX_VIDEO',
}

/** The library item a block shows, as the backend checks it (content.mediaId). */
function blockMedia(type: BlockType, content: Record<string, unknown>): string | null {
  switch (type) {
    case 'IMAGE':
    case 'ILLUSTRATION':
      return mediaRef(String(content.url ?? ''), 'IMAGE')
    case 'VIDEO':
    case 'BOX_VIDEO':
      return mediaRef(String(content.url ?? ''), 'VIDEO')
    case 'AUDIO':
      return mediaRef(String(content.url ?? ''), 'AUDIO')
    case 'SCREEN': {
      const v = String(content.screenMedia ?? '')
      return mediaRef(v, 'IMAGE') ?? mediaRef(v, 'VIDEO')
    }
    default:
      return null
  }
}

/**
 * A media field as the backend takes it: the id of a library item of the right kind, or nothing.
 * Anything else — an older hand-typed file name, a placeholder — would make the save fail.
 */
function mediaRef(v: string | null | undefined, kind: 'IMAGE' | 'VIDEO' | 'AUDIO'): string | null {
  const m = mediaOf(v)
  return m && m.kind === kind ? m.id : null
}

/** An object type id, when the object picked is one the museum has registered. */
const typeId = (id: string | null | undefined) => (id && /^\d+$/.test(id) ? Number(id) : null)

function toTrigger(t: Trigger): TriggerDto {
  if (t.type === 'SCAN') return { type: 'SCAN', scanObjectTypeId: typeId(t.cardTypeId) }
  if (t.type === 'TIMER_ELAPSED') return { type: 'TIMER_ELAPSED', seconds: t.seconds }
  return { type: t.type }
}

function toCondition(c: Condition | null): ConditionDto | null {
  if (!c) return null
  if (c.type === 'VAR_CMP') return { type: 'VAR_CMP', variable: c.var, op: c.op as ConditionOp, value: String(c.value) }
  return { type: 'FLAG_IS', variable: c.var, value: String(c.value) }
}

function toEffect(e: Effect): EffectDto {
  switch (e.type) {
    case 'SET_NUMBER':
      return { type: 'SET_NUMBER', variable: e.var, value: String(e.value) }
    case 'ADD_NUMBER':
      return { type: 'ADD_NUMBER', variable: e.var, amount: e.amount }
    case 'SET_FLAG':
      return { type: 'SET_FLAG', variable: e.var, value: String(e.value) }
    case 'BOX_SCREEN':
      return { type: 'BOX_SCREEN', text: e.text }
    case 'BOX_AUDIO':
      return { type: 'BOX_AUDIO', url: mediaRef(e.url, 'AUDIO') }
    case 'REPLY':
      // A reply needs a colour; an extra reply the author has not coloured yet is shown in grey.
      return {
        type: 'REPLY',
        color: e.color || 'grey',
        text: e.text,
        media: mediaRef(e.media, 'IMAGE'),
        audio: mediaRef(e.audio, 'AUDIO'),
        boxVideo: mediaRef(e.boxVideo, 'VIDEO'),
      }
  }
}

function toDestination(d: Destination, sceneKeyOf: Map<string, string>) {
  if (d.type === 'GO_TO') {
    const target = sceneKeyOf.get(d.targetSceneKey ?? '')
    return target ? { type: 'GO_TO' as const, targetSceneKey: target } : { type: 'STAY' as const }
  }
  return { type: d.type }
}

const isWhole = (v: unknown) => Number.isInteger(Number(v)) && String(v).trim() !== ''

/** An effect the backend accepts as it is, made whole where it only needs rounding, or null. */
function playableEffect(e: Effect, kinds: Map<string, string>): Effect | null {
  switch (e.type) {
    case 'SET_NUMBER':
      return kinds.get(e.var) === 'NUMBER' ? { ...e, value: Math.round(Number(e.value) || 0) } : null
    case 'ADD_NUMBER':
      return kinds.get(e.var) === 'NUMBER' ? { ...e, amount: Math.round(Number(e.amount) || 0) } : null
    case 'SET_FLAG':
      return kinds.get(e.var) === 'FLAG' ? e : null
    case 'BOX_SCREEN':
      return String(e.text ?? '').trim() ? e : null
    default:
      return e
  }
}

/**
 * The rules of a scene as the backend accepts them, whatever was built or changed by hand in
 * Scenes and rules: a timer always waits at least a second; "the visit starts" only on the start
 * scene; a condition on a variable the experience does not keep drops its rule (running it
 * unconditionally would change what it means); an effect that cannot run is left out; and since the
 * first catch-all ("anything else") ends the object rules of a scene, object rules after it move up
 * before it and a second catch-all is dropped.
 */
function playable(rules: Rule[], isStart: boolean, kinds: Map<string, string>): Rule[] {
  const ok = rules
    .filter((r) => r.trigger.type !== 'SESSION_STARTED' || isStart)
    .filter((r) => {
      const c = r.condition
      if (!c) return true
      if (c.type === 'VAR_CMP') return kinds.get(c.var) === 'NUMBER' && c.op in OPS && isWhole(c.value)
      return kinds.get(c.var) === 'FLAG'
    })
    .map((r) => ({
      ...r,
      trigger: r.trigger.type === 'TIMER_ELAPSED' ? { ...r.trigger, seconds: Math.max(1, Math.round(Number(r.trigger.seconds) || 0)) } : r.trigger,
      effects: r.effects.map((e) => playableEffect(e, kinds)).filter((e): e is Effect => !!e),
    }))
  const at = ok.findIndex((r) => r.trigger.type === 'SCAN_OTHER')
  if (at < 0) return ok
  const after = ok.slice(at + 1)
  return [
    ...ok.slice(0, at),
    ...after.filter((r) => r.trigger.type === 'SCAN'),
    ok[at],
    ...after.filter((r) => r.trigger.type !== 'SCAN' && r.trigger.type !== 'SCAN_OTHER'),
  ]
}

/**
 * The write body for the experience as it stands. Keys are freshly allocated from the document the
 * save is based on, so the backend replaces the previous scenes with these.
 */
export function toWriteRequest(a: Authoring, base: ExperienceDto): ExperienceWriteRequest {
  const keys = createKeyAllocator(base)
  const kinds = new Map(a.built.variables.map((v) => [v.key, v.kind]))
  const sceneKeyOf = new Map(a.built.scenes.map((sc) => [sc.id, keys.sceneKey()]))

  const content: FlowContent = {
    details: a.details,
    islands: a.islands.map(({ key, templateId, cfg, next }) => ({ key, templateId, cfg, next })),
    islandSeq: a.islandSeq,
    ...(a.edits && Object.keys(a.edits).length ? { edits: a.edits } : {}),
  }

  const scenes: SceneDto[] = a.built.scenes.map((sc, position) => {
    const blocks: BlockDto[] = []
    for (const b of sc.blocks) {
      const type = STORED_TYPE[b.type]
      if (!type) continue
      const mediaId = blockMedia(type, b.content)
      blocks.push({
        blockKey: keys.blockKey(),
        type,
        position: blocks.length,
        content: JSON.parse(JSON.stringify({ ...b.content, kind: b.type, ...(mediaId ? { mediaId } : {}) })) as JsonValue,
      })
    }
    const rules: RuleDto[] = playable(sc.rules, !!sc.start, kinds).map((r: Rule, i) => ({
      ruleKey: keys.ruleKey(),
      position: i,
      trigger: toTrigger(r.trigger),
      condition: toCondition(r.condition),
      effects: r.effects.map(toEffect),
      destination: toDestination(r.destination, sceneKeyOf),
    }))
    return {
      sceneKey: sceneKeyOf.get(sc.id)!,
      name: sc.name,
      position,
      isStart: !!sc.start,
      initCardTypeId: sc.start ? typeId(sc.initCard) : null,
      blocks,
      rules,
    }
  })

  return {
    // Set once by the first save; after that the backend refuses any other value.
    output: base.output ?? a.details.output,
    flow: { schemaVersion: FLOW_SCHEMA, content: JSON.parse(JSON.stringify(content)) },
    variables: a.built.variables.map((v) => ({ key: v.key, kind: v.kind, initial: String(v.initial) })),
    scenes,
  }
}

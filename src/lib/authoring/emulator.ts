import { reactive } from 'vue'
import { scanName, scanType, type Authoring, type Condition, type Effect, type Rule, type Scene } from './engine'

/**
 * A test run of the whole visit, played on the scenes and rules the engine built. It starts where a
 * real one does — an idle Box — and always says what the Box is waiting for on the current screen,
 * so a tester never has to guess which object or wait does something.
 */

export type LogKind = 'scan' | 'rule' | 'goto' | 'state' | 'box' | 'none' | 'sys'
type Reply = Extract<Effect, { type: 'REPLY' }>

export interface Emulator {
  idle: boolean
  sceneId: string
  state: Record<string, number | boolean>
  log: { text: string; kind: LogKind }[]
  reply: Reply | null
  sound: string | null
  /** Counts every sound started, so the same sound twice in a row still plays twice. */
  soundSeq: number
}

export function createEmulator(a: Authoring) {
  const emu = reactive<Emulator>({ idle: true, sceneId: 'x-start', state: {}, log: [], reply: null, sound: null, soundSeq: 0 })

  const sceneOf = (id: string) => a.built.scenes.find((s) => s.id === id)
  const sceneName = (id: string | null) => sceneOf(id ?? '')?.name || id || ''
  const resetState = () => a.built.variables.forEach((v) => (emu.state[v.key] = v.initial as number | boolean))

  function start() {
    emu.idle = true
    emu.sceneId = 'x-start'
    emu.state = {}
    emu.reply = null
    emu.sound = null
    resetState()
    emu.log = [{ text: 'The Box is idle', kind: 'sys' }]
  }

  function wake() {
    emu.idle = false
    emu.sceneId = 'x-start'
    resetState()
    emu.log.push({ text: 'Placed ' + scanName(a, a.details.startCard) + ' — the visit begins', kind: 'scan' })
    fire((r) => r.trigger.type === 'SESSION_STARTED')
    arrive()
  }

  function holds(c: Condition | null) {
    if (!c) return true
    const v = emu.state[c.var]
    if (c.type === 'FLAG_IS') return !!v === !!c.value
    const n = Number(v)
    return { GTE: n >= c.value, LTE: n <= c.value, GT: n > c.value, LT: n < c.value, EQ: n === c.value, NEQ: n !== c.value }[c.op] ?? true
  }

  /** Of the current scene's rules that match, the first whose condition holds runs. */
  function fire(matches: (r: Rule) => boolean, depth = 0): boolean {
    if (depth > 6) return false
    const scene = sceneOf(emu.sceneId)
    if (!scene) return false
    const rule = scene.rules.filter(matches).find((r) => holds(r.condition))
    if (!rule) return false
    emu.log.push({ text: '“' + rule.label + '”', kind: 'rule' })
    for (const e of rule.effects) {
      if (e.type === 'SET_NUMBER' || e.type === 'SET_FLAG') {
        emu.state[e.var] = e.value
        emu.log.push({ text: `${e.var} → ${e.type === 'SET_FLAG' ? (e.value ? 'on' : 'off') : e.value}`, kind: 'state' })
      }
      if (e.type === 'ADD_NUMBER') {
        emu.state[e.var] = (Number(emu.state[e.var]) || 0) + e.amount
        emu.log.push({ text: `${e.var} → ${emu.state[e.var]}`, kind: 'state' })
      }
      if (e.type === 'BOX_SCREEN') emu.log.push({ text: 'Box: ' + e.text, kind: 'box' })
      if (e.type === 'BOX_AUDIO') {
        emu.sound = e.url
        emu.soundSeq++
        emu.log.push({ text: '♪ ' + e.url, kind: 'box' })
      }
      if (e.type === 'REPLY') {
        emu.reply = e
        if (e.audio) {
          emu.sound = e.audio
          emu.soundSeq++
        }
        emu.log.push({ text: (a.details.output === 'DISPLAY' ? '▣ ' : '♪ ') + e.text, kind: 'box' })
      }
    }
    const d = rule.destination
    // A "go to" whose scene is gone stays, as the saved experience does.
    if (d.type === 'GO_TO' && d.targetSceneKey && sceneOf(d.targetSceneKey)) {
      emu.sceneId = d.targetSceneKey
      emu.log.push({ text: '→ ' + sceneName(d.targetSceneKey), kind: 'goto' })
      arrive(depth + 1)
    }
    if (d.type === 'END') {
      emu.log.push({ text: 'Visit complete — the Box is idle again', kind: 'sys' })
      emu.idle = true
      emu.sceneId = 'x-start'
      emu.reply = null
      emu.sound = null
    }
    return true
  }
  const arrive = (depth = 0) => fire((r) => r.trigger.type === 'SCENE_ENTERED', depth)

  /** A scan looks for the object by name first and falls back to the catch-all. */
  function scan(id: string) {
    if (emu.idle) {
      if (id === a.details.startCard) wake()
      else
        emu.log.push({
          text: `Placed ${scanType(a, id).name} — an idle Box only reacts to ${scanName(a, a.details.startCard) || 'the start object'}`,
          kind: 'none',
        })
      return
    }
    emu.log.push({ text: 'Placed ' + scanType(a, id).name, kind: 'scan' })
    emu.reply = null
    emu.sound = null
    const hit =
      fire((r) => r.trigger.type === 'SCAN' && r.trigger.cardTypeId === id) || fire((r) => r.trigger.type === 'SCAN_OTHER')
    if (!hit) emu.log.push({ text: 'Nothing is waiting for that here', kind: 'none' })
  }

  /** Time and video are fired rule by rule: each timed rule on a screen is its own button. */
  function fireKey(key: string, what: string) {
    if (emu.idle) return
    emu.log.push({ text: what, kind: 'scan' })
    emu.reply = null
    emu.sound = null
    fire((r) => r.key === key)
  }

  /** What the current screen reacts to, in plain words — the tester's map. */
  function choices(scene: Scene | undefined) {
    const out = {
      objects: new Map<string, string>(),
      other: null as string | null,
      timed: [] as { key: string; seconds: number; what: string }[],
      video: [] as { key: string; what: string }[],
    }
    if (emu.idle) {
      if (a.details.startCard) out.objects.set(a.details.startCard, 'the visit begins')
      return out
    }
    for (const r of scene?.rules ?? []) {
      const where =
        r.destination.type === 'GO_TO'
          ? 'go to “' + sceneName(r.destination.targetSceneKey) + '”'
          : r.destination.type === 'END'
            ? 'the visit ends'
            : ''
      const said = r.effects.find((e): e is Reply => e.type === 'REPLY')
      const what = [said ? '“' + said.text + '”' : '', where].filter(Boolean).join(', then ') || r.label
      const t = r.trigger
      if (t.type === 'SCAN' && t.cardTypeId && !out.objects.has(t.cardTypeId)) out.objects.set(t.cardTypeId, what)
      if (t.type === 'SCAN_OTHER' && !out.other) out.other = what
      if (t.type === 'TIMER_ELAPSED') out.timed.push({ key: r.key, seconds: t.seconds, what })
      if (t.type === 'VIDEO_ENDED') out.video.push({ key: r.key, what })
    }
    return out
  }

  start()
  return { emu, start, scan, fireKey, choices, sceneOf }
}

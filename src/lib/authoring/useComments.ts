import { onMounted, onUnmounted, reactive, ref, watch, type Ref } from 'vue'
import {
  addComment,
  listComments,
  replyToComment,
  setCommentResolved,
  type CommentThreadDto,
} from '@/api/museotekBox'
import { stepName as flowStepName, type Authoring, type Scene } from './engine'

/**
 * The comments on one experience: anyone looking at it — in a test run or on its
 * page — can comment on a screen, and anyone can reply. Kept fresh every few seconds so what others
 * write turns up without a reload. One instance per experience page, shared with its test run.
 */
const REFRESH_MS = 5000

/** The idle Box has no scene of its own; its comments carry this key. */
export const IDLE_SCENE = 'idle'

export function useComments(projectId: Ref<string>) {
  const threads = ref<CommentThreadDto[]>([])
  const error = ref('')

  /** Which threads are unfolded, whether resolved ones show in the drawer, and the reply being written. */
  const ui = reactive({
    open: new Set<string>(),
    showResolved: false,
    reply: { root: null as string | null, text: '', where: 'page' as 'page' | 'emu' },
  })

  async function refresh() {
    if (!projectId.value) return
    try {
      threads.value = await listComments(projectId.value)
    } catch {
      // A failed refresh keeps what is shown; the next one tries again.
    }
  }

  let timer: ReturnType<typeof setInterval> | null = null
  const tick = () => document.visibilityState === 'visible' && refresh()
  onMounted(() => {
    refresh()
    timer = setInterval(tick, REFRESH_MS)
  })
  onUnmounted(() => timer && clearInterval(timer))
  watch(projectId, () => {
    threads.value = []
    refresh()
  })

  const threadsFor = (step?: string | null) => threads.value.filter((t) => !step || t.stepKey === step)
  const openThreads = (step?: string | null) => threadsFor(step).filter((t) => !t.resolved)

  function failed() {
    error.value = 'That did not send. Try again in a moment.'
    return false
  }

  /** Start a thread about a screen; `scene` null is the idle Box. */
  async function post(text: string, scene: Scene | null): Promise<boolean> {
    const body = text.trim().slice(0, 2000)
    if (!body) return false
    try {
      await addComment(projectId.value, { body, sceneKey: scene ? scene.id : IDLE_SCENE, stepKey: stepKeyOf(scene) })
    } catch {
      return failed()
    }
    error.value = ''
    await refresh()
    return true
  }

  async function reply(rootId: string, text: string): Promise<boolean> {
    const body = text.trim().slice(0, 2000)
    if (!body) return false
    try {
      await replyToComment(projectId.value, rootId, body)
    } catch {
      return failed()
    }
    error.value = ''
    ui.open.add(rootId)
    await refresh()
    return true
  }

  async function setResolved(id: string, value: boolean) {
    try {
      const t = await setCommentResolved(projectId.value, id, value)
      threads.value = threads.value.map((x) => (x.id === id ? t : x))
    } catch {
      failed()
    }
  }

  return { threads, error, ui, refresh, threadsFor, openThreads, post, reply, setResolved }
}

export type Comments = ReturnType<typeof useComments>

/** The step a screen belongs to; the idle Box counts as the Start. */
export const stepKeyOf = (sc: Scene | null) =>
  !sc || sc.island === '@start' ? 'start' : sc.island === '@end' ? 'end' : (sc.island ?? 'start')

export const stepName = (a: Authoring, key: string | null) =>
  key === 'start' || key === 'end' || a.islands.some((x) => x.key === key) ? flowStepName(a, key ?? '') : 'A removed activity'

/** The screen a thread is about, by the name it has now. */
export function sceneName(a: Authoring, key: string | null) {
  if (!key || key === IDLE_SCENE) return 'The idle Box'
  return a.built.scenes.find((sc) => sc.id === key)?.name ?? ''
}

export function relTime(iso: string) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000
  if (!isFinite(s)) return ''
  if (s < 60) return 'just now'
  if (s < 3600) return Math.floor(s / 60) + ' min ago'
  if (s < 86400) return Math.floor(s / 3600) + ' h ago'
  return new Date(iso).toLocaleDateString()
}

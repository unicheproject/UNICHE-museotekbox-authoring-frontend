import { onUnmounted, reactive, ref, type Ref } from 'vue'
import {
  StaleExperienceError,
  createProject,
  describeError,
  getProject,
  saveExperience,
  updateProject,
  type ExperienceDto,
  type ProjectDto,
} from '@/api/museotekBox'
import { slugify } from '@/lib/slug'
import { fetchShared, invalidate, storeExperience } from '@/lib/queries'
import { addIsland, fixRows, newDetails, rebuild, type Authoring, type OutputId, type ScanType } from './engine'
import { readFlow, toWriteRequest } from './document'
import { loadMediaLibrary } from './media'

const SAVE_DELAY = 600

function blankAuthoring(): Authoring {
  return { details: newDetails(), islands: [], built: { scenes: [], variables: [] }, islandSeq: 0, scanTypes: [] }
}

/**
 * Creating an experience: the project, then its first save — where it plays, and the first
 * activity if one was picked. The Catalogue needs a slug the author is never asked for; it is
 * derived from the name, and a name that slugifies to nothing (Greek, for one) falls back to a
 * generated handle. The project exists once the first call succeeds, so it is returned even if
 * the first save then fails; the page opens on it either way.
 */
export async function createExperience(
  orgId: string,
  input: { name: string; output: OutputId; first: string | null },
): Promise<{ project: ProjectDto; saveError: string | null; firstKey: string | null }> {
  const name = input.name.trim()
  const slug = slugify(name) || `experience-${Date.now().toString(36)}`
  const project = await createProject(orgId, { name, slug })
  try {
    const [base, types] = await Promise.all([
      fetchShared('experience', project.id, { staleMs: 0 }),
      fetchShared('scanTypes', orgId),
    ])
    const a = blankAuthoring()
    a.scanTypes = types
    a.details = newDetails({ name, output: input.output })
    const firstKey = input.first ? addIsland(a, input.first).key : null
    if (!firstKey) rebuild(a)
    storeExperience(await saveExperience(project.id, base.version, toWriteRequest(a, base)))
    return { project, saveError: null, firstKey }
  } catch (e) {
    return { project, saveError: describeError(e), firstKey: null }
  }
}

/**
 * One experience on its page: loaded from the backend, edited in place, and saved shortly after
 * every change. Components change `authoring` and then call `commit()`.
 */
export function useAuthoring(projectId: Ref<string>) {
  const authoring = reactive<Authoring>(blankAuthoring())
  const project = ref<ProjectDto | null>(null)
  const loading = ref(true)
  const error = ref<string | null>(null)
  const saveError = ref<string | null>(null)
  /** A change is waiting to be saved, or being saved. */
  const pending = ref(false)
  /** A new name is waiting to be saved, or being saved. */
  const renaming = ref(false)

  let base: ExperienceDto | null = null
  let timer: ReturnType<typeof setTimeout> | null = null
  let saving = false
  let again = false

  function adopt(doc: ExperienceDto) {
    base = doc
    const saved = readFlow(doc)
    authoring.details = saved?.details ?? newDetails({ output: doc.output ?? 'DISPLAY' })
    authoring.islands = saved?.islands ?? []
    authoring.islandSeq = saved?.islandSeq ?? 0
    authoring.edits = saved?.edits ?? {}
    // The name lives on the project; the flow's copy only follows it.
    if (project.value) authoring.details.name = project.value.name
    rebuild(authoring)
  }

  async function load() {
    loading.value = true
    error.value = null
    try {
      const p = await getProject(projectId.value)
      project.value = p
      // The document is always read fresh: it is what the next save builds on. The scan types may
      // come from the cache the experiences list filled.
      const [doc, types] = await Promise.all([
        fetchShared('experience', p.id, { staleMs: 0 }),
        fetchShared('scanTypes', p.orgId),
        loadMediaLibrary(p.orgId),
      ])
      authoring.scanTypes = types
      adopt(doc)
    } catch (e) {
      error.value = describeError(e)
    } finally {
      loading.value = false
    }
  }

  async function save() {
    if (!base) return
    if (saving) {
      again = true
      return
    }
    saving = true
    try {
      base = await saveExperience(base.projectId, base.version, toWriteRequest(authoring, base))
      // The list's card for it now shows what was just saved, without asking again.
      storeExperience(base)
      saveError.value = null
    } catch (e) {
      if (e instanceof StaleExperienceError) {
        // Someone else saved first: show what is there now rather than overwrite it.
        adopt(e.current)
        storeExperience(e.current)
        saveError.value = e.message
      } else {
        saveError.value = describeError(e)
      }
    } finally {
      saving = false
      if (again) {
        again = false
        void save()
      } else if (!timer) {
        pending.value = false
      }
    }
  }

  /** After any change: rebuild the flow now, save it a moment later. */
  function commit() {
    rebuild(authoring)
    pending.value = true
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      timer = null
      void save()
    }, SAVE_DELAY)
  }

  /**
   * The name belongs to the project, not to the experience document, so it is saved on its own,
   * a moment after the last keystroke. An empty name is not sent: the project keeps its old one.
   */
  let renameTimer: ReturnType<typeof setTimeout> | null = null
  async function saveName() {
    renameTimer = null
    const name = authoring.details.name.trim()
    if (!project.value || !name || name === project.value.name) {
      renaming.value = false
      return
    }
    try {
      project.value = await updateProject(project.value.id, { name })
      invalidate.projects()
      saveError.value = null
    } catch (e) {
      saveError.value = describeError(e)
    } finally {
      if (!renameTimer) renaming.value = false
    }
  }

  function rename(name: string) {
    authoring.details.name = name
    renaming.value = true
    if (renameTimer) clearTimeout(renameTimer)
    renameTimer = setTimeout(() => void saveName(), SAVE_DELAY)
  }

  onUnmounted(() => {
    // Leaving the page must not lose the last change.
    if (timer) {
      clearTimeout(timer)
      timer = null
      void save()
    }
    if (renameTimer) {
      clearTimeout(renameTimer)
      void saveName()
    }
  })

  return { authoring, project, loading, error, saveError, pending, renaming, load, commit, rename }
}

/** What an experience's card in the list says about it, read from its document. */
export interface ExperienceSummary {
  output: OutputId
  /** The template of each activity, in order. */
  templates: string[]
  /** Things left before it can be published; null when the scan types are not known. */
  missing: number | null
  /** The picture the visitor sees first, else the first picture it shows anywhere. */
  pictureId: string | null
}

/** Read a saved experience the way its page would, for its card in the list. */
export function summarize(doc: ExperienceDto, types: ScanType[] | null): ExperienceSummary {
  const saved = readFlow(doc)
  const a = blankAuthoring()
  a.details = saved?.details ?? newDetails({ output: doc.output ?? 'DISPLAY' })
  a.islands = saved?.islands ?? []
  a.islandSeq = saved?.islandSeq ?? 0
  a.edits = saved?.edits ?? {}
  a.scanTypes = types ?? []
  let missing: number | null = null
  if (types) {
    try {
      rebuild(a)
      missing = fixRows(a).length
    } catch {
      missing = null
    }
  }
  const pictureOf = (scenes: ExperienceDto['scenes']) =>
    scenes
      .flatMap((s) => s.blocks)
      .map((b) => (b.type === 'IMAGE' && b.content && typeof b.content === 'object' && !Array.isArray(b.content) ? b.content.mediaId : null))
      .find((id): id is string => typeof id === 'string')
  return {
    output: a.details.output,
    templates: a.islands.map((x) => x.templateId),
    missing,
    pictureId: pictureOf(doc.scenes.filter((s) => s.isStart)) ?? pictureOf(doc.scenes) ?? null,
  }
}

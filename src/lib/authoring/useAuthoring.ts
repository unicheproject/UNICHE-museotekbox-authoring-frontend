import { onUnmounted, reactive, ref, type Ref } from 'vue'
import {
  StaleExperienceError,
  createProject,
  describeError,
  getExperience,
  getProject,
  listScanObjectTypes,
  saveExperience,
  type ExperienceDto,
  type ProjectDto,
} from '@/api/museotekBox'
import { slugify } from '@/lib/slug'
import { addIsland, newDetails, rebuild, type Authoring, type OutputId } from './engine'
import { readFlow, scanTypesFrom, toWriteRequest } from './document'
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
): Promise<{ project: ProjectDto; saveError: string | null }> {
  const name = input.name.trim()
  const slug = slugify(name) || `experience-${Date.now().toString(36)}`
  const project = await createProject(orgId, { name, slug })
  try {
    const [base, types] = await Promise.all([getExperience(project.id), listScanObjectTypes(orgId)])
    const a = blankAuthoring()
    a.scanTypes = scanTypesFrom(types)
    a.details = newDetails({ name, output: input.output })
    if (input.first) addIsland(a, input.first)
    else rebuild(a)
    await saveExperience(project.id, base.version, toWriteRequest(a, base))
    return { project, saveError: null }
  } catch (e) {
    return { project, saveError: describeError(e) }
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
      const [doc, types] = await Promise.all([
        getExperience(p.id),
        listScanObjectTypes(p.orgId),
        loadMediaLibrary(p.orgId),
      ])
      authoring.scanTypes = scanTypesFrom(types)
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
      saveError.value = null
    } catch (e) {
      if (e instanceof StaleExperienceError) {
        // Someone else saved first: show what is there now rather than overwrite it.
        adopt(e.current)
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

  onUnmounted(() => {
    // Leaving the page must not lose the last change.
    if (timer) {
      clearTimeout(timer)
      timer = null
      void save()
    }
  })

  return { authoring, project, loading, error, saveError, pending, load, commit }
}

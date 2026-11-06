import { computed, effectScope, onScopeDispose, shallowReactive, watch, type EffectScope, type Ref } from 'vue'
import type { ProjectDto } from '@/api/museotekBox'
import { useShared } from './queries'

/** The tool this frontend authors for; an organisation's projects include other tools' too. */
const TOOL_SLUG = 'museotekbox'

type OrgQueries = {
  projects: ReturnType<typeof useShared<'projects'>>
  commentCounts: ReturnType<typeof useShared<'commentCounts'>>
  installed: ReturnType<typeof useShared<'installed'>>
  scanTypes: ReturnType<typeof useShared<'scanTypes'>>
}

/**
 * What the experiences list shows that is not inside an experience, with a handful of calls per
 * organisation however many experiences there are: the projects, the open comments of all of them,
 * which are on a Box, and the scan types (to count what is missing). Each is a shared query,
 * so the experience page and the Boxes screens reuse what this loaded, and the other way round.
 *
 * Only the projects are needed to show the list; the rest are best-effort, and a card without one
 * just leaves that part out.
 */
export function useExperienceList(orgIds: Ref<string[]>) {
  const orgs = shallowReactive(new Map<string, OrgQueries>())
  const scopes = new Map<string, EffectScope>()

  watch(
    orgIds,
    (ids) => {
      for (const [id, scope] of scopes) {
        if (ids.includes(id)) continue
        scope.stop()
        scopes.delete(id)
        orgs.delete(id)
      }
      for (const id of ids) {
        if (scopes.has(id)) continue
        // One scope per organisation, so its subscriptions end when it leaves the list.
        const scope = effectScope(true)
        scopes.set(id, scope)
        orgs.set(
          id,
          scope.run(() => ({
            projects: useShared('projects', () => id),
            commentCounts: useShared('commentCounts', () => id),
            installed: useShared('installed', () => id),
            scanTypes: useShared('scanTypes', () => id),
          }))!,
        )
      }
    },
    { immediate: true },
  )
  onScopeDispose(() => scopes.forEach((s) => s.stop()))

  /** This tool's experiences, most recently changed first. */
  const experiences = computed<ProjectDto[]>(() =>
    [...orgs.values()]
      .flatMap((o) => o.projects.data.value ?? [])
      .filter((p) => p.toolSlug === TOOL_SLUG)
      .sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? '')),
  )
  /** Nothing to show yet: some organisation's projects are still on their first load. */
  const pending = computed(() => [...orgs.values()].some((o) => o.projects.pending.value))
  const error = computed(() => [...orgs.values()].map((o) => o.projects.error.value).find(Boolean) ?? null)

  /** What a card needs besides its own experience; null where it is not known (yet). */
  function factsOf(p: ProjectDto) {
    const o = orgs.get(p.orgId)
    const installed = o?.installed.data.value
    return {
      comments: o?.commentCounts.data.value?.[p.id] ?? 0,
      published: installed ? installed.includes(p.id) : null,
      scanTypes: o?.scanTypes.data.value ?? null,
    }
  }

  return { experiences, pending, error, factsOf }
}

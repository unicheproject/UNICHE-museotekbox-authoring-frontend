import { computed, effectScope, onScopeDispose, shallowReactive, watch, type EffectScope, type Ref } from 'vue'
import type { PublishStatusDto } from '@/api/museotekBox'
import { useShared } from './queries'

/**
 * The publish status of a short, changing list of experiences (the Dashboard's recent ones): one
 * `GET /projects/{id}/published` each, through the same cache key the editor uses, so a save there
 * (which invalidates it) refreshes it here too. Keep the list short: it is one call per id.
 *
 * `undefined` = not known yet (or failed), `null` = never published.
 */
export function usePublishStatuses(ids: Ref<string[]>) {
  const queries = shallowReactive(new Map<string, ReturnType<typeof useShared<'publishStatus'>>>())
  const scopes = new Map<string, EffectScope>()

  watch(
    ids,
    (list) => {
      for (const [id, scope] of scopes) {
        if (list.includes(id)) continue
        scope.stop()
        scopes.delete(id)
        queries.delete(id)
      }
      for (const id of list) {
        if (scopes.has(id)) continue
        const scope = effectScope(true)
        scopes.set(id, scope)
        queries.set(id, scope.run(() => useShared('publishStatus', () => id))!)
      }
    },
    { immediate: true },
  )
  onScopeDispose(() => scopes.forEach((s) => s.stop()))

  const statuses = computed<Record<string, PublishStatusDto | null | undefined>>(() =>
    Object.fromEntries([...queries].map(([id, q]) => [id, q.data.value])),
  )
  return { statuses }
}

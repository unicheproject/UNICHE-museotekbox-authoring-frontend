import { computed, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useAuthzStore } from '@/stores/authz'
import { useOrgNames } from '@/lib/useOrgNames'
import type { SelectOption } from '@/components/ui/select'

/**
 * Organisation scope for the screens whose endpoints are all `/organisations/{orgId}/…`.
 *
 * The backend has no endpoint that lists organisations, so the only ones the UI can know about are
 * those named in the authorization context. This picks a default and exposes the rest as options,
 * so every org-scoped screen behaves the same instead of re-deriving it.
 */
export function useOrgScope() {
  const authzStore = useAuthzStore()
  const { context } = storeToRefs(authzStore)
  const { names: orgNames, resolve: resolveOrgNames } = useOrgNames()

  const orgIds = computed(() => {
    const ctx = context.value
    if (!ctx) return []
    return Array.from(
      new Set([...ctx.managedOrganisations, ...ctx.projectMemberships.map((m) => m.orgId)]),
    )
  })

  const orgId = ref('')

  watch(
    orgIds,
    (ids) => {
      if (ids.length) resolveOrgNames(ids)
      // Keep the current choice if it is still available; otherwise fall back to the first.
      if (!ids.includes(orgId.value)) orgId.value = ids[0] ?? ''
    },
    { immediate: true },
  )

  const orgOptions = computed<SelectOption[]>(() =>
    orgIds.value.map((id) => ({ value: id, label: orgNames.value[id] ?? id })),
  )

  /** True when the user has more than one organisation and therefore needs the picker. */
  const showPicker = computed(() => orgIds.value.length > 1)

  onMounted(() => authzStore.load())

  return { context, orgIds, orgId, orgOptions, orgNames, showPicker }
}

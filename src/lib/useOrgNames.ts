import { ref } from 'vue'
import { getOrganisation } from '@/api/museotekBox'

/** In-memory, session-lifetime cache — org names rarely change and there's no org-browsing screen to invalidate it from. */
const cache = new Map<string, string>()

/** Resolve organisation ids to display names, avoiding raw UUIDs in the UI. */
export function useOrgNames() {
  const names = ref<Record<string, string>>({})

  async function resolve(orgIds: string[]): Promise<void> {
    await Promise.all(
      orgIds.map(async (orgId) => {
        const cached = cache.get(orgId)
        if (cached) {
          names.value[orgId] = cached
          return
        }
        try {
          const org = await getOrganisation(orgId)
          cache.set(orgId, org.name)
          names.value[orgId] = org.name
        } catch {
          /* keep the id as the fallback label */
        }
      }),
    )
  }

  return { names, resolve }
}

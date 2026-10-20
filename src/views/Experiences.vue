<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { ArrowRight, Briefcase, Plus, Trash2 } from 'lucide-vue-next'
import { useAuthzStore } from '@/stores/authz'
import { listProjects } from '@/api/museotekBox'
import ExperienceCover from '@/components/experience/ExperienceCover.vue'
import { useOrgNames } from '@/lib/useOrgNames'
import { useQuery } from '@/lib/useQuery'
import { statusVariant } from '@/lib/status'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Alert } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import CreateExperienceDialog from '@/components/experience/CreateExperienceDialog.vue'

/** The tool this frontend authors for; the organisation's projects include other tools' too. */
const TOOL_SLUG = 'museotekbox'

const route = useRoute()
const router = useRouter()
const authzStore = useAuthzStore()
const { context } = storeToRefs(authzStore)
const { names: orgNames, resolve: resolveOrgNames } = useOrgNames()

/** Every organisation the user can see experiences in: ones they manage, plus ones they are a member of. */
const orgIds = computed(() => {
  const ctx = context.value
  if (!ctx) return []
  return Array.from(
    new Set([...ctx.managedOrganisations, ...ctx.projectMemberships.map((m) => m.orgId)]),
  )
})

const canCreate = computed(
  () => context.value?.platformAdmin || (context.value?.managedOrganisations.length ?? 0) > 0,
)
/** The New experience dialog has its own address, so it opens over the list from a link too. */
const createOpen = computed(() => route.name === 'experience-new' && canCreate.value)
/** The experience is created in the organisation the author manages; they are not asked which. */
const createOrgId = computed(() => context.value?.managedOrganisations[0] ?? '')

const canSeeDeleted = computed(
  () => context.value?.platformAdmin === true || (context.value?.managedOrganisations.length ?? 0) > 0,
)

// There is no cross-organisation projects endpoint, so the list is the union of one call per
// organisation. The query key includes the ids, so it re-fetches when the user's orgs change.
const { data, pending, error } = useQuery(
  () => (orgIds.value.length ? ['projects', ...orgIds.value] : null),
  async () => (await Promise.all(orgIds.value.map((orgId) => listProjects(orgId)))).flat(),
)

onMounted(() => authzStore.load())
watch(orgIds, (ids) => ids.length && resolveOrgNames(ids), { immediate: true })

/** This tool's experiences, most recently changed first. */
const experiences = computed(() =>
  (data.value ?? [])
    .filter((p) => p.toolSlug === TOOL_SLUG)
    .sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? '')),
)

const grid = 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'

/** "Acropolis Museum · 3 experiences", as shown under the title. */
const subtitle = computed(() => {
  const names = orgIds.value.map((id) => orgNames.value[id]).filter(Boolean)
  const n = experiences.value.length
  return `${names.length ? names.join(', ') + ' · ' : ''}${n} experience${n === 1 ? '' : 's'}`
})
</script>

<template>
  <div>
    <div class="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 class="text-2xl font-extrabold tracking-tight">Experiences</h1>
        <p class="mt-0.5 text-[13px] text-muted-foreground">{{ subtitle }}</p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <RouterLink
          v-if="canSeeDeleted"
          to="/experiences/deleted"
          :class="buttonVariants({ variant: 'secondary', size: 'sm' })"
        >
          <Trash2 class="h-3.5 w-3.5" />
          Deleted
        </RouterLink>
        <RouterLink
          v-if="canCreate"
          to="/experiences/new"
          :class="buttonVariants({ variant: 'gradient', size: 'sm' })"
        >
          <Plus class="h-4 w-4" />
          New experience
        </RouterLink>
      </div>
    </div>

    <Alert v-if="error" variant="error" title="Couldn't load your experiences">{{ error }}</Alert>

    <div v-else-if="pending" :class="grid">
      <div v-for="n in 8" :key="n" class="overflow-hidden rounded-lg border border-border bg-card shadow-xs">
        <Skeleton class="h-24 w-full rounded-none" />
        <div class="space-y-3 p-4">
          <Skeleton class="h-4 w-32" />
          <Skeleton class="h-4 w-16" />
        </div>
      </div>
    </div>

    <Card v-else-if="!experiences.length">
      <EmptyState title="No experiences" :icon="Briefcase" />
    </Card>

    <!-- The experience card: a dark picture band over the name, and
         the status the Dashboard shows beside "Open". -->
    <div v-else :class="grid">
      <RouterLink
        v-for="exp in experiences"
        :key="exp.id"
        :to="`/experiences/${exp.id}`"
        class="group flex flex-col overflow-hidden rounded-lg border border-border bg-card shadow-xs transition-all duration-150 hover:-translate-y-0.5 hover:border-brand-deep/35 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <ExperienceCover :project-id="exp.id" :org-id="exp.orgId" />
        <span class="flex flex-1 flex-col p-4">
          <span class="mb-4 line-clamp-2 text-sm font-bold leading-snug text-foreground">
            {{ exp.name || 'Untitled experience' }}
          </span>
          <span class="mt-auto flex items-center justify-between gap-2 border-t border-border pt-3">
            <Badge :variant="statusVariant(exp.status)" dot>{{ exp.status }}</Badge>
            <span class="inline-flex items-center gap-1 text-xs font-bold text-brand-deep">
              Open<ArrowRight class="h-3.5 w-3.5 transition-transform duration-150 group-hover:translate-x-0.5" />
            </span>
          </span>
        </span>
      </RouterLink>
    </div>

    <CreateExperienceDialog v-if="createOpen" :org-id="createOrgId" @close="router.push('/experiences')" />
  </div>
</template>

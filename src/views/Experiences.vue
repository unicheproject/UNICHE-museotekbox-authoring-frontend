<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { Briefcase, Plus, Trash2 } from 'lucide-vue-next'
import { useAuthzStore } from '@/stores/authz'
import ExperienceCard from '@/components/experience/ExperienceCard.vue'
import { useExperienceList } from '@/lib/useExperienceList'
import { useOrgNames } from '@/lib/useOrgNames'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Alert } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import CreateExperienceDialog from '@/components/experience/CreateExperienceDialog.vue'

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

// Everything the list shows, with a few calls per organisation however many experiences there
// are; each card then reads only its own experience, once it is on screen.
const { experiences, pending, error, factsOf } = useExperienceList(orgIds)

onMounted(() => authzStore.load())
watch(orgIds, (ids) => ids.length && resolveOrgNames(ids), { immediate: true })

// Past laptop size the page is not capped (route meta `wide`), so the grid adds columns.
const grid = 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3 min-[1700px]:grid-cols-4 min-[2300px]:grid-cols-5'
// The buttons of the authoring screens: squared-off, uppercase.
const btnOutline =
  'inline-flex items-center justify-center gap-2 rounded-md border border-input bg-white px-3.5 py-2 text-[11.5px] font-extrabold uppercase tracking-button text-secondary-foreground hover:border-brand-deep hover:text-brand-deep'
const btnGrad =
  'inline-flex items-center justify-center gap-2 rounded-md bg-grad-brand px-3.5 py-2 text-[11.5px] font-extrabold uppercase tracking-button text-white shadow-md transition-transform hover:-translate-y-0.5'

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
          :class="btnOutline"
        >
          <Trash2 class="h-3.5 w-3.5" />
          Deleted
        </RouterLink>
        <RouterLink
          v-if="canCreate"
          to="/experiences/new"
          :class="btnGrad"
        >
          <Plus class="h-4 w-4" />
          New experience
        </RouterLink>
      </div>
    </div>

    <Alert v-if="error" variant="error" title="Couldn't load your experiences">{{ error }}</Alert>

    <div v-else-if="pending" :class="grid">
      <div v-for="n in 8" :key="n" class="overflow-hidden rounded-lg border border-border bg-card shadow-xs">
        <Skeleton class="h-32 w-full rounded-none" />
        <div class="space-y-3 p-4">
          <Skeleton class="h-4 w-32" />
          <Skeleton class="h-4 w-16" />
        </div>
      </div>
    </div>

    <Card v-else-if="!experiences.length">
      <EmptyState title="No experiences" :icon="Briefcase" />
    </Card>

    <!-- The experience card: its picture with its activities, what it is, and what is left to do. -->
    <div v-else :class="grid">
      <ExperienceCard
        v-for="exp in experiences"
        :key="exp.id"
        :project="exp"
        v-bind="factsOf(exp)"
      />
    </div>

    <CreateExperienceDialog v-if="createOpen" :org-id="createOrgId" @close="router.push('/experiences')" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { Briefcase, Plus, Trash2 } from 'lucide-vue-next'
import { useAuthzStore } from '@/stores/authz'
import ExperienceCard from '@/components/experience/ExperienceCard.vue'
import { useExperienceList } from '@/lib/useExperienceList'
import { canCreateExperience } from '@/lib/experiences'
import { useOrgNames } from '@/lib/useOrgNames'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Alert } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import CreateExperienceDialog from '@/components/experience/CreateExperienceDialog.vue'
import { cardGrid as grid, headBtnGrad as btnGrad, headBtnOutline as btnOutline } from '@/components/experience/styles'
import ListHeader from '@/components/inventory/ListHeader.vue'

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

const canCreate = computed(() => canCreateExperience(context.value))
/** The New experience dialog has its own address, so it opens over the list from a link too. */
const createOpen = computed(() => route.name === 'experience-new' && canCreate.value)
/** The experience is created in the organisation the author manages; they are not asked which. */
const createOrgId = computed(() => context.value?.managedOrganisations[0] ?? '')

const canSeeDeleted = computed(
  () => context.value?.platformAdmin === true || (context.value?.managedOrganisations.length ?? 0) > 0,
)

// Everything the list shows, with a few calls per organisation however many experiences there
// are; each card then reads only its own experience, once it is on screen.
const { experiences, pending, error, refresh, factsOf } = useExperienceList(orgIds)

onMounted(() => authzStore.load())
watch(orgIds, (ids) => ids.length && resolveOrgNames(ids), { immediate: true })


/** "Acropolis Museum · 3 experiences", as shown under the title. */
const subtitle = computed(() => {
  const names = orgIds.value.map((id) => orgNames.value[id]).filter(Boolean)
  const n = experiences.value.length
  return `${names.length ? names.join(', ') + ' · ' : ''}${n} experience${n === 1 ? '' : 's'}`
})
</script>

<template>
  <div>
    <ListHeader title="Experiences" :subtitle="subtitle">
      <template #actions>
        <RouterLink v-if="canSeeDeleted" to="/experiences/deleted" :class="btnOutline">
          <Trash2 class="h-3.5 w-3.5" />
          Deleted
        </RouterLink>
        <RouterLink v-if="canCreate" to="/experiences/new" :class="btnGrad">
          <Plus class="h-4 w-4" />
          New experience
        </RouterLink>
      </template>
    </ListHeader>

    <Alert v-if="error" variant="error" title="Couldn't load your experiences">
      {{ error }}
      <button type="button" :class="[btnOutline, 'mt-3']" @click="refresh()">Try again</button>
    </Alert>

    <div v-else-if="pending" :class="grid">
      <div v-for="n in 8" :key="n" class="overflow-hidden rounded-lg border border-border bg-card shadow-xs">
        <Skeleton class="h-32 w-full rounded-none" />
        <div class="space-y-3 p-4">
          <Skeleton class="h-4 w-32" />
          <Skeleton class="h-4 w-16" />
        </div>
      </div>
    </div>

    <!-- Nothing yet: what an experience is, and the first step for whoever can take it. -->
    <Card v-else-if="!experiences.length">
      <EmptyState
        title="No experiences yet"
        :description="
          canCreate
            ? 'An experience is a visit you create: what visitors see and hear at a Box. Create your first one to guide visitors through your collection.'
            : 'Experiences you are invited to appear here. Ask your organisation manager to invite you.'
        "
        :icon="Briefcase"
        tone="brand"
      >
        <template v-if="canCreate" #action>
          <RouterLink to="/experiences/new" :class="btnGrad"><Plus class="h-4 w-4" />New experience</RouterLink>
        </template>
      </EmptyState>
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

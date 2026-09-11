<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { storeToRefs } from 'pinia'
import { Briefcase, ChevronRight, Package, ScanLine, Users } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import { useAuthzStore } from '@/stores/authz'
import {
  describeError,
  listBoxes,
  listMembers,
  listProjects,
  listScanObjects,
  type ProjectDto,
} from '@/api/museotekBox'
import { useOrgNames } from '@/lib/useOrgNames'
import { statusVariant } from '@/lib/status'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { PageHeader } from '@/components/ui/page-header'
import { StatCard } from '@/components/ui/stat-card'

const authStore = useAuthStore()
const authzStore = useAuthzStore()
const { profile } = storeToRefs(authStore)
const { context } = storeToRefs(authzStore)
const { names: orgNames, resolve: resolveOrgNames } = useOrgNames()

const experiences = ref<ProjectDto[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

/** Mirrors Experiences.vue — UX gating only; the backend re-enforces this on every write. */
const canCreate = computed(
  () => context.value?.platformAdmin || (context.value?.managedOrganisations.length ?? 0) > 0,
)

/** Every organisation the context touches, whether managed or merely a membership's home org. */
const orgIds = computed(() => {
  const ctx = context.value
  if (!ctx) return []
  return Array.from(new Set([...ctx.managedOrganisations, ...ctx.projectMemberships.map((m) => m.orgId)]))
})

const roleByProject = computed(() =>
  Object.fromEntries((context.value?.projectMemberships ?? []).map((m) => [m.projectId, m.role])),
)

const displayName = computed(() => profile.value?.name ?? profile.value?.username ?? '')

/**
 * Counts for the stat row. Each is the union across the user's organisations, and each is
 * independent: a section the backend refuses shows a dash rather than taking the whole home screen
 * down with it.
 */
const scanObjectCount = ref<number | null>(null)
const boxCount = ref<number | null>(null)
const memberCount = ref<number | null>(null)

async function countAcrossOrgs<T>(load: (orgId: string) => Promise<T[]>): Promise<number | null> {
  try {
    const lists = await Promise.all(orgIds.value.map(load))
    return lists.reduce((total, list) => total + list.length, 0)
  } catch {
    return null
  }
}

/**
 * ProjectDto carries no created timestamp, so "recent" is the backend's own order, capped, with a
 * link through to the full Experiences screen.
 */
const RECENT_LIMIT = 5
const recent = computed(() => experiences.value.slice(0, RECENT_LIMIT))

/** Two-letter monogram for the cover-image placeholder slot. */
function monogram(name: string) {
  const parts = name.split(/\s+/).filter(Boolean)
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '—'
}

async function load() {
  loading.value = true
  error.value = null
  try {
    await authzStore.load()
    if (!context.value) return
    await resolveOrgNames(orgIds.value)
    const lists = await Promise.all(orgIds.value.map((orgId) => listProjects(orgId)))
    experiences.value = lists.flat()
  } catch (e) {
    error.value = describeError(e)
  } finally {
    loading.value = false
  }

  // Deliberately after the experiences render: the list is the point of the screen, the counts are
  // decoration, and they must not hold up first paint.
  void countAcrossOrgs(listScanObjects).then((n) => (scanObjectCount.value = n))
  void countAcrossOrgs(listBoxes).then((n) => (boxCount.value = n))
  void countAcrossOrgs(listMembers).then((n) => (memberCount.value = n))
}

onMounted(load)
</script>

<template>
  <div>
    <PageHeader :title="displayName ? `Welcome, ${displayName}` : 'Welcome'" />

    <!-- One panel divided by hairlines rather than four bordered cards: the figures belong to the
         same set, and separate cards left a wide empty margin beside every number. -->
    <div
      class="grid grid-cols-2 divide-x divide-y divide-border overflow-hidden rounded-lg border border-border bg-card shadow-xs sm:grid-cols-4 sm:divide-y-0"
    >
      <StatCard
        label="Experiences"
        :value="loading ? null : experiences.length"
        :icon="Briefcase"
        to="/experiences"
      />
      <StatCard label="Scan objects" :value="scanObjectCount" :icon="ScanLine" to="/scan-objects" />
      <StatCard label="Boxes" :value="boxCount" :icon="Package" to="/boxes" />
      <StatCard label="Members" :value="memberCount" :icon="Users" to="/members" />
    </div>

    <div class="mb-3 mt-9 flex items-baseline justify-between">
      <p class="label-overline text-muted-foreground">Your Experiences</p>
      <RouterLink
        v-if="experiences.length > RECENT_LIMIT"
        to="/experiences"
        class="text-xs font-semibold text-brand-deep hover:underline"
      >
        View all {{ experiences.length }}
      </RouterLink>
    </div>

    <p v-if="loading" class="text-[13px] text-muted-foreground">Loading…</p>
    <p v-else-if="error" class="text-[13px] text-destructive">{{ error }}</p>

    <Card v-else-if="!recent.length">
      <EmptyState title="No experiences" :icon="Briefcase">
        <template v-if="canCreate" #action>
          <RouterLink to="/experiences/new" :class="buttonVariants({ variant: 'gradient', size: 'sm' })">
            New Experience
          </RouterLink>
        </template>
      </EmptyState>
    </Card>

    <!-- The whole row is the link, so it needs no trailing button competing with the status. -->
    <div v-else class="overflow-hidden rounded-lg border border-border bg-card shadow-xs">
      <RouterLink
        v-for="exp in recent"
        :key="exp.id"
        :to="`/experiences/${exp.id}`"
        class="group flex items-center gap-3.5 border-b border-border px-4 py-3 transition-colors last:border-b-0 hover:bg-surface-2 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
      >
        <span
          class="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-brand-deep/[0.08] text-[11px] font-extrabold text-brand-deep"
        >
          {{ monogram(exp.name) }}
        </span>
        <span class="min-w-0 flex-1">
          <span class="block truncate text-sm font-bold text-foreground">{{ exp.name }}</span>
          <span class="block truncate text-xs text-muted-foreground">
            {{ orgNames[exp.orgId] ?? exp.orgId }}
            <template v-if="roleByProject[exp.id]"> · {{ roleByProject[exp.id].toLowerCase() }}</template>
            · {{ exp.slug }}
          </span>
        </span>
        <Badge :variant="statusVariant(exp.status)" dot>{{ exp.status }}</Badge>
        <ChevronRight
          class="h-4 w-4 shrink-0 text-muted-foreground/50 transition-colors group-hover:text-muted-foreground"
        />
      </RouterLink>
    </div>
  </div>
</template>

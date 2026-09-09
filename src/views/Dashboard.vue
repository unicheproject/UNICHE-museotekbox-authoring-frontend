<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/stores/auth'
import { useAuthzStore } from '@/stores/authz'
import { describeError, listProjects, type ProjectDto } from '@/api/museotekBox'
import { useOrgNames } from '@/lib/useOrgNames'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'

const authStore = useAuthStore()
const authzStore = useAuthzStore()
const { profile } = storeToRefs(authStore)
const { context, loading: authzLoading } = storeToRefs(authzStore)
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

const firstName = computed(() => profile.value?.name?.split(' ')[0] ?? profile.value?.username ?? '')

const accessLevel = computed(() => {
  if (!context.value) return '—'
  if (context.value.platformAdmin) return 'Platform admin'
  return context.value.managedOrganisations.length ? 'Org manager' : 'Contributor'
})

const subtitle = computed(() => {
  if (authzLoading.value || loading.value) return 'Resolving your authorization…'
  const n = experiences.value.length
  const m = orgIds.value.length
  return `${n} ${n === 1 ? 'experience' : 'experiences'} across ${m} ${m === 1 ? 'organisation' : 'organisations'}`
})

/**
 * ProjectDto carries no created/updated timestamp, so there is nothing to sort "recent" by — the
 * list is shown in backend order and capped, with a link through to the full Experiences screen.
 */
const RECENT_LIMIT = 5
const recent = computed(() => experiences.value.slice(0, RECENT_LIMIT))

/** The backend's project status is a free string; anything unrecognised falls back to neutral. */
function statusVariant(status: string) {
  switch (status?.toUpperCase()) {
    case 'ACTIVE':
      return 'success' as const
    case 'DELETED':
    case 'ARCHIVED':
      return 'error' as const
    case 'DRAFT':
      return 'neutral' as const
    default:
      return 'purple' as const
  }
}

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
}

onMounted(load)
</script>

<template>
  <div>
    <!-- Top row -->
    <header class="mb-[22px] flex flex-wrap items-start justify-between gap-4">
      <div>
        <p class="overline mb-1 text-brand-purple">Authoring Dashboard</p>
        <h1 class="text-xl font-extrabold text-foreground">
          Welcome back<span v-if="firstName">, {{ firstName }}</span>
        </h1>
        <p class="text-[13px] font-light text-muted-foreground">{{ subtitle }}</p>
      </div>
      <!-- The brand gradient is reserved for the single main CTA on a screen. -->
      <RouterLink
        v-if="canCreate"
        to="/experiences/new"
        :class="buttonVariants({ variant: 'gradient', size: 'sm' })"
      >
        + New Experience
      </RouterLink>
    </header>

    <!-- Stats. These are the real counts from the authorization context; the backend exposes no
         analytics endpoints, so no play/scoring tiles are shown. -->
    <div class="mb-[22px] grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <div class="rounded-lg border border-border bg-card px-4 py-3.5 shadow-xs">
        <p class="mb-2 text-[10px] font-bold uppercase tracking-[0.09em] text-muted-foreground">
          Experiences
        </p>
        <p class="text-2xl font-extrabold leading-none tracking-[-0.02em] text-brand-deep">
          {{ experiences.length }}
        </p>
        <p class="mt-1.5 text-xs font-semibold text-muted-foreground">
          {{ context?.projectMemberships.length ?? 0 }} with a direct role
        </p>
      </div>

      <div class="rounded-lg border border-border bg-card px-4 py-3.5 shadow-xs">
        <p class="mb-2 text-[10px] font-bold uppercase tracking-[0.09em] text-muted-foreground">
          Organisations
        </p>
        <p class="text-2xl font-extrabold leading-none tracking-[-0.02em] text-brand-deep">
          {{ orgIds.length }}
        </p>
        <p class="mt-1.5 text-xs font-semibold text-muted-foreground">
          {{ context?.managedOrganisations.length ?? 0 }} you manage
        </p>
      </div>

      <div class="rounded-lg border border-border bg-card px-4 py-3.5 shadow-xs">
        <p class="mb-2 text-[10px] font-bold uppercase tracking-[0.09em] text-muted-foreground">
          Access level
        </p>
        <p class="text-2xl font-extrabold leading-none tracking-[-0.02em] text-brand-deep">
          {{ accessLevel }}
        </p>
        <p class="mt-1.5 text-xs font-semibold text-muted-foreground">
          Re-checked server-side on every action
        </p>
      </div>
    </div>

    <!-- Experience list -->
    <div class="mb-3 flex items-baseline justify-between">
      <p class="overline text-muted-foreground">Your Experiences</p>
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
    <div
      v-else-if="!recent.length"
      class="rounded-md border border-dashed border-border bg-surface-2 px-4 py-8 text-center"
    >
      <p class="text-[13px] font-bold text-foreground">No experiences yet</p>
      <p class="caption mt-1">
        {{ canCreate ? 'Create your first experience to get started.' : 'You have not been added to an experience yet.' }}
      </p>
    </div>
    <ul v-else class="flex flex-col gap-2">
      <li
        v-for="exp in recent"
        :key="exp.id"
        class="flex items-center gap-3.5 rounded-md border border-border bg-card px-4 py-3.5"
      >
        <div
          class="flex h-11 w-11 shrink-0 items-center justify-center rounded-sm bg-surface-2 text-[11px] font-bold text-muted-foreground"
        >
          {{ monogram(exp.name) }}
        </div>
        <div class="min-w-0 flex-1">
          <p class="truncate text-[13px] font-bold text-foreground">{{ exp.name }}</p>
          <p class="truncate text-[11px] text-muted-foreground">
            {{ orgNames[exp.orgId] ?? exp.orgId }}
            <template v-if="roleByProject[exp.id]"> · {{ roleByProject[exp.id].toLowerCase() }}</template>
            · {{ exp.slug }}
          </p>
        </div>
        <Badge :variant="statusVariant(exp.status)">{{ exp.status }}</Badge>
        <RouterLink
          :to="`/experiences/${exp.id}`"
          :class="buttonVariants({ variant: 'outline', size: 'sm' })"
        >
          Open
        </RouterLink>
      </li>
    </ul>
  </div>
</template>

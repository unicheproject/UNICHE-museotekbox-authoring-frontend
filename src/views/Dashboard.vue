<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { storeToRefs } from 'pinia'
import { Briefcase, MessageCircle, Package, Plus, ScanLine, Sparkles, Upload, Users } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import { useAuthzStore } from '@/stores/authz'
import { canManageOrg, managesAnyOrg } from '@/platform/authz'
import { canCreateExperience } from '@/lib/experiences'
import { publishLabel } from '@/lib/publish'
import { useExperienceList } from '@/lib/useExperienceList'
import { usePublishStatuses } from '@/lib/usePublishStatuses'
import { useOrgNames } from '@/lib/useOrgNames'
import { fetchShared } from '@/lib/queries'
import { Alert } from '@/components/ui/alert'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { StatCard } from '@/components/ui/stat-card'
import ExperienceCard from '@/components/experience/ExperienceCard.vue'
import { cardBox, cardGrid, headBtnGrad, headBtnOutline } from '@/components/experience/styles'
import GetStarted from '@/components/experience/GetStarted.vue'
import ListHeader from '@/components/inventory/ListHeader.vue'

/**
 * The home screen. Its experiences are the Experiences screen's own (same organisations, same
 * filter, same order, through `useExperienceList`), and it draws them the same way: the same header,
 * card, grid and page width (route meta `wide`). Counts are totals across the user's organisations,
 * named under the title.
 */
const authStore = useAuthStore()
const authzStore = useAuthzStore()
const { profile } = storeToRefs(authStore)
const { context } = storeToRefs(authzStore)
const { names: orgNames, resolve: resolveOrgNames } = useOrgNames()

/** Every organisation the user can see experiences in: ones they manage, plus ones they are a member of. */
const orgIds = computed(() => {
  const ctx = context.value
  if (!ctx) return []
  return Array.from(new Set([...ctx.managedOrganisations, ...ctx.projectMemberships.map((m) => m.orgId)]))
})
/** The organisations whose Boxes and members this user may see in full (manager or platform admin). */
const managedOrgIds = computed(() => orgIds.value.filter((id) => canManageOrg(context.value, id)))
const managesAny = computed(() => managesAnyOrg(context.value))

const { experiences, pending, error, refresh, factsOf, openComments, idleBoxes } = useExperienceList(orgIds)
const canCreate = computed(() => canCreateExperience(context.value))

watch(orgIds, (ids) => ids.length && resolveOrgNames(ids), { immediate: true })

/** The organisation the "Next step" card is about: the first one this user manages. */
const guideOrgId = computed(() => context.value?.managedOrganisations[0] ?? null)
/** While the card shows, it holds the one button: the header's "New experience" steps aside. */
const guideShown = ref(false)
/** No experience at all yet (loaded, not failed): the recent list gives way to a welcome. */
const noExperiences = computed(() => !pending.value && !error.value && experiences.value.length === 0)
/** For someone who can't create: what to expect, with nothing to press. */
const welcomeText = computed(() =>
  orgIds.value.length
    ? 'Your organisation manager invites you to experiences. When they do, they appear here.'
    : 'You are not part of an organisation yet. Ask your organisation manager to invite you.',
)

const displayName = computed(() => profile.value?.name ?? profile.value?.username ?? '')
/** "Acropolis Museum · 11 experiences", as under the Experiences title. */
const subtitle = computed(() => {
  const names = orgIds.value.map((id) => orgNames.value[id]).filter(Boolean)
  const n = experiences.value.length
  // A new organisation is just its name: "· 0 experiences" says nothing the page doesn't.
  if (n === 0 && !pending.value) return names.join(', ') || undefined
  return `${names.length ? names.join(', ') + ' · ' : ''}${n} experience${n === 1 ? '' : 's'}`
})

/**
 * The most recently edited, as on the Experiences screen; each also reads its publish status.
 * Four, one row of the grid: on narrower screens the grid has fewer columns, and the cards that
 * would start a second row are hidden (`rowOnly`), so it stays one row at every width.
 */
const RECENT_LIMIT = 4
const recent = computed(() => experiences.value.slice(0, RECENT_LIMIT))
const { statuses } = usePublishStatuses(computed(() => recent.value.map((p) => p.id)))
const withChanges = computed(() => recent.value.filter((p) => statuses.value[p.id]?.hasUnpublishedChanges))
const idle = computed(() => (managesAny.value ? idleBoxes(managedOrgIds.value) : null))

/**
 * Counts for the stat row. Each is the total across the user's organisations, and each is
 * independent: a section the backend refuses shows a dash rather than taking the whole screen down.
 */
const scanObjectCount = ref<number | null>(null)
const boxCount = ref<number | null>(null)
const memberCount = ref<number | null>(null)

async function countAcrossOrgs(name: 'scanObjects' | 'boxes', ids: string[]): Promise<number | null> {
  try {
    // Through the shared cache: opening that screen next shows them without asking again.
    const lists: unknown[][] = await Promise.all(ids.map((orgId) => fetchShared(name, orgId)))
    return lists.reduce((total, list) => total + list.length, 0)
  } catch {
    return null
  }
}

/** People, not rows: someone in two of the organisations counts once. */
async function countMembers(ids: string[]): Promise<number | null> {
  try {
    const lists = await Promise.all(ids.map((orgId) => fetchShared('members', orgId)))
    return new Set(lists.flat().map((m) => m.email.toLowerCase())).size
  } catch {
    return null
  }
}

/** Hide the card that would wrap: 2 columns from sm, 3 from lg, 4 from 1700px (see `cardGrid`). */
function rowOnly(index: number) {
  if (index === 2) return 'sm:max-lg:hidden'
  if (index === 3) return 'sm:max-[1699px]:hidden'
  return ''
}

/** The attention boxes: a card's box, a little smaller. */
const chip = `inline-flex items-center gap-2.5 px-4 py-3 text-[13px] font-bold text-foreground ${cardBox}`

/** The two counts the guide can change from here: read again after it made something. */
function recount() {
  void countAcrossOrgs('scanObjects', orgIds.value).then((n) => (scanObjectCount.value = n))
  void countAcrossOrgs('boxes', orgIds.value).then((n) => (boxCount.value = n))
}

onMounted(async () => {
  await authzStore.load()
  if (!context.value) return
  recount()
  // Only a manager or a platform admin can read an organisation's members; anyone else would get
  // an error, so the count is not shown to them at all.
  if (managesAny.value) void countMembers(managedOrgIds.value).then((n) => (memberCount.value = n))
})
</script>

<template>
  <div>
    <!-- The same header as the Experiences screen. -->
    <ListHeader :title="displayName ? `Welcome, ${displayName}` : 'Welcome'" :subtitle="orgIds.length ? subtitle : undefined">
      <template v-if="canCreate && !guideShown" #actions>
        <RouterLink to="/experiences/new" :class="headBtnGrad">
          <Plus class="h-4 w-4" />
          New experience
        </RouterLink>
      </template>
    </ListHeader>

    <!-- Only for a new organisation (lib/guide.ts): a manager's steps, one at a time, until hidden. -->
    <GetStarted v-if="guideOrgId" :org-id="guideOrgId" @visible="guideShown = $event" @changed="recount" />

    <!-- The figures in one white box, like a card; hairlines between them. -->
    <div
      class="grid grid-cols-2 divide-x divide-y divide-border overflow-hidden rounded-lg border border-border bg-white shadow-xs sm:divide-y-0"
      :class="managesAny ? 'sm:grid-cols-4' : 'sm:grid-cols-3'"
    >
      <!-- In the order of the Next step card. A zero reads "None yet", with a small way to make the first one for whoever may. -->
      <StatCard
        label="Scan objects"
        :value="scanObjectCount"
        :icon="ScanLine"
        to="/scan-objects"
        :add-label="managesAny ? 'New scan object' : undefined"
        :add-to="managesAny ? '/scan-objects' : undefined"
      />
      <StatCard
        label="Experiences"
        :value="pending ? null : experiences.length"
        :icon="Briefcase"
        to="/experiences"
        :add-label="canCreate ? 'New experience' : undefined"
        :add-to="canCreate ? '/experiences/new' : undefined"
      />
      <StatCard
        label="Boxes"
        :value="boxCount"
        :icon="Package"
        to="/boxes"
        :add-label="managesAny ? 'Add a Box' : undefined"
        :add-to="managesAny ? '/boxes' : undefined"
      />
      <StatCard v-if="managesAny" label="Members" :value="memberCount" :icon="Users" to="/members" :note="memberCount === 1 ? '(you)' : undefined" />
    </div>

    <!-- Needs attention: only what is there to act on; nothing at all when all is well. -->
    <div v-if="withChanges.length || openComments || idle" class="mt-5 flex flex-wrap gap-3" aria-label="Needs attention">
      <RouterLink
        v-if="withChanges.length"
        :to="withChanges.length === 1 ? `/experiences/${withChanges[0].id}/publish` : '/experiences'"
        :class="chip"
      >
        <Upload class="h-4 w-4 text-warning" />
        <template v-if="withChanges.length === 1">“{{ withChanges[0].name }}” has changes that are not published</template>
        <template v-else>{{ withChanges.length }} recent experiences have changes that are not published</template>
      </RouterLink>
      <RouterLink v-if="openComments" to="/experiences" :class="chip">
        <MessageCircle class="h-4 w-4 text-brand-deep" />
        {{ openComments }} open comment{{ openComments === 1 ? '' : 's' }}
      </RouterLink>
      <RouterLink v-if="idle" to="/boxes" :class="chip">
        <Package class="h-4 w-4 text-muted-foreground" />
        {{ idle }} Box{{ idle === 1 ? '' : 'es' }} {{ idle === 1 ? 'plays' : 'play' }} nothing
      </RouterLink>
    </div>

    <!-- No experience yet: a manager has the guide above; anyone else gets a welcome with nothing to press. -->
    <Card v-if="noExperiences && !canCreate" class="mt-7">
      <EmptyState title="Welcome to Museotek Box" :description="welcomeText" :icon="Sparkles" tone="brand" />
    </Card>

    <div v-if="!noExperiences" class="mb-3 mt-7 flex items-baseline justify-between">
      <p class="label-overline text-muted-foreground">Recently edited</p>
      <RouterLink
        v-if="experiences.length > RECENT_LIMIT"
        to="/experiences"
        class="text-xs font-semibold text-brand-deep hover:underline"
      >
        View all {{ experiences.length }}
      </RouterLink>
    </div>

    <!-- The same states and the same cards as the Experiences screen. -->
    <Alert v-if="error" variant="error" title="Couldn't load your experiences">
      {{ error }}
      <button type="button" :class="[headBtnOutline, 'mt-3']" @click="refresh()">Try again</button>
    </Alert>

    <div v-else-if="pending" :class="cardGrid">
      <div
        v-for="n in RECENT_LIMIT"
        :key="n"
        class="overflow-hidden rounded-lg border border-border bg-card shadow-xs"
        :class="rowOnly(n - 1)"
      >
        <Skeleton class="h-32 w-full rounded-none" />
        <div class="space-y-3 p-4">
          <Skeleton class="h-4 w-32" />
          <Skeleton class="h-4 w-16" />
        </div>
      </div>
    </div>

    <div v-else-if="recent.length" :class="cardGrid">
      <ExperienceCard
        v-for="(exp, i) in recent"
        :key="exp.id"
        :class="rowOnly(i)"
        :project="exp"
        v-bind="factsOf(exp)"
        :publish="publishLabel(statuses[exp.id])"
      />
    </div>
  </div>
</template>

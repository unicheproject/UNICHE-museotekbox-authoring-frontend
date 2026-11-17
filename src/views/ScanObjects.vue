<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Plus, ScanLine } from 'lucide-vue-next'
import {
  KIND_LABEL,
  SCAN_OBJECT_KINDS,
  listScanObjects,
  resolveScanObjectKind,
  type ScanObjectDto,
  type ScanObjectTypeDto,
} from '@/api/museotekBox'
import { useQuery } from '@/lib/useQuery'
import { useShared } from '@/lib/queries'
import { useDataList } from '@/lib/useDataList'
import { useOrgScope } from '@/lib/useOrgScope'
import { canManageOrg } from '@/platform/authz'
import { Alert } from '@/components/ui/alert'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Select, type SelectOption } from '@/components/ui/select'
import { SearchInput } from '@/components/ui/input'
import { Pagination } from '@/components/ui/pagination'
import { Skeleton } from '@/components/ui/skeleton'
import { cardGrid, headBtnGrad, headBtnOutline, pill, pillTone } from '@/components/experience/styles'
import NewScanObjectDialog from '@/components/scan/NewScanObjectDialog.vue'
import ListHeader from '@/components/inventory/ListHeader.vue'
import InventoryCard from '@/components/inventory/InventoryCard.vue'
import { scanObjectLook } from '@/components/inventory/scanLook'

/**
 * The organisation's scan objects, drawn like the Experiences screen: the same header, cards and
 * grid. Everyone sees them; only a manager of the organisation adds, changes or deletes ("View
 * only" for the rest). Card types have no screen of their own: a manager makes one from the scan
 * object form ("+ New type…").
 */
const router = useRouter()
const { orgId, orgOptions, orgNames, showPicker, context } = useOrgScope()

const canManage = computed(() => canManageOrg(context.value, orgId.value))

const { data, pending, error, refresh } = useQuery(
  () => (orgId.value ? ['scan-objects', orgId.value] : null),
  () => listScanObjects(orgId.value),
)
const objects = computed(() => data.value ?? [])
const cardTypes = useShared('cardTypes', () => orgId.value || null)
const typeById = computed<Record<number, ScanObjectTypeDto>>(() =>
  Object.fromEntries((cardTypes.data.value ?? []).map((t) => [t.id, t])),
)

const subtitle = computed(() => {
  const org = orgNames.value[orgId.value]
  const n = objects.value.length
  return `${org ? org + ' · ' : ''}${n} scan object${n === 1 ? '' : 's'}`
})

// ── Search, filters, pages ──
const kindFilter = ref('')
const typeFilter = ref('')
const kindOptions = computed<SelectOption[]>(() => [
  { value: '', label: 'All kinds' },
  ...SCAN_OBJECT_KINDS.map((kind) => ({ value: kind, label: KIND_LABEL[kind] })),
])
const typeOptions = computed<SelectOption[]>(() => [
  { value: '', label: 'All card types' },
  { value: 'none', label: 'No card type' },
  ...[...(cardTypes.data.value ?? [])]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((t) => ({ value: String(t.id), label: t.name })),
])
const filters = computed(() => {
  const predicates: ((o: ScanObjectDto) => boolean)[] = []
  if (kindFilter.value) predicates.push((o) => resolveScanObjectKind(o.kind) === kindFilter.value)
  if (typeFilter.value === 'none') predicates.push((o) => o.scanObjectTypeId === null)
  else if (typeFilter.value) predicates.push((o) => String(o.scanObjectTypeId ?? '') === typeFilter.value)
  return predicates
})
const list = useDataList<ScanObjectDto>(data, {
  // The tag is worth searching too: finding the object a physical tag belongs to is a real task.
  searchFields: (o) => [o.name, o.rfidTag, o.scanObjectTypeId !== null ? typeById.value[o.scanObjectTypeId]?.name : null],
  sortValues: { name: (o) => o.name },
  initialSort: { key: 'name', direction: 'asc' },
  pageSize: 12,
  filters,
})

/** Back to everything: the search box and both filters emptied. */
function clearFilters() {
  list.reset()
  kindFilter.value = ''
  typeFilter.value = ''
}

/** The cards of the page shown, each with how it looks (icon, colour, card type). */
const cards = computed(() => list.rows.value.map((o) => ({ o, look: scanObjectLook(o, typeById.value) })))

/** The line under a card's name: its kind, and its card type unless that only repeats the name. */
function cardLine(o: ScanObjectDto, look: ReturnType<typeof scanObjectLook>) {
  const typeName = look.typeName ?? 'No card type'
  return typeName.trim().toLowerCase() === o.name.trim().toLowerCase() ? look.kindLabel : `${look.kindLabel} · ${typeName}`
}

// ── New scan object (the shared dialog); once made, it opens ──
const createOpen = ref(false)
function startCreate() {
  createOpen.value = true
}
function onCreated(o: ScanObjectDto) {
  router.push(`/scan-objects/${orgId.value}/${o.id}`)
}
</script>

<template>
  <div>
    <ListHeader title="Scan objects" :subtitle="orgId ? subtitle : undefined" :view-only="!!orgId && !canManage">
      <template #actions>
        <Select v-if="showPicker" v-model="orgId" :options="orgOptions" class="w-52" aria-label="Organisation" />
        <button v-if="canManage" type="button" :class="headBtnGrad" @click="startCreate">
          <Plus class="h-4 w-4" />New scan object
        </button>
      </template>
    </ListHeader>

    <!-- A search box sized for a name, with the filters beside it; on a phone the search takes the row
         and the filters share the next. Hidden while there is nothing at all to search. -->
    <div v-if="objects.length" class="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
      <SearchInput
        v-model="list.search.value"
        label="Search scan objects by name, RFID tag or card type"
        placeholder="Search name, tag or card type…"
        class="min-w-0 sm:max-w-xs"
      />
      <div class="grid grid-cols-2 gap-3 sm:flex">
        <Select v-model="kindFilter" :options="kindOptions" class="w-full sm:w-44" aria-label="Filter by kind" />
        <Select v-model="typeFilter" :options="typeOptions" class="w-full sm:w-48" aria-label="Filter by card type" />
      </div>
    </div>

    <Alert v-if="error" variant="error" title="Couldn't load the scan objects">
      {{ error }}
      <button type="button" :class="[headBtnOutline, 'mt-3']" @click="refresh()">Try again</button>
    </Alert>

    <div v-else-if="pending" :class="cardGrid">
      <div v-for="n in 6" :key="n" class="overflow-hidden rounded-lg border border-border bg-card shadow-xs">
        <Skeleton class="h-16 w-full rounded-none" />
        <div class="space-y-3 p-4">
          <Skeleton class="h-4 w-32" />
          <Skeleton class="h-4 w-20" />
        </div>
      </div>
    </div>

    <!-- Nothing yet: what scan objects are, and the first step for whoever can take it. -->
    <Card v-else-if="!objects.length">
      <EmptyState
        title="No scan objects yet"
        :description="`Scan objects are the cards and objects visitors place on a Box to start or answer an experience.${canManage ? '' : ' Your organisation manager adds them.'}`"
        :icon="ScanLine"
        tone="brand"
      >
        <template v-if="canManage" #action>
          <button type="button" :class="headBtnGrad" @click="startCreate"><Plus class="h-4 w-4" />New scan object</button>
        </template>
      </EmptyState>
    </Card>

    <!-- Some exist, but the search or a filter hides them all. -->
    <Card v-else-if="!list.rows.value.length">
      <EmptyState title="Nothing matches" description="Try another search or filter." :icon="ScanLine">
        <template #action>
          <button type="button" :class="headBtnOutline" @click="clearFilters">Clear filters</button>
        </template>
      </EmptyState>
    </Card>

    <template v-else>
      <div :class="cardGrid">
        <InventoryCard
          v-for="{ o, look } in cards"
          :key="o.id"
          :to="`/scan-objects/${orgId}/${o.id}`"
          :title="o.name"
          :subtitle="cardLine(o, look)"
          :icon="look.icon"
          :colour="look.colour"
          :dark-icon="look.darkIcon"
          compact
        >
          <template #pills>
            <span v-if="o.rfidTag" :class="[pill, pillTone.neutral, 'font-mono']">{{ o.rfidTag }}</span>
            <span v-else :class="[pill, pillTone.outline]">Not tagged</span>
            <span v-if="look.type?.exit" :class="[pill, pillTone.warning]">Exit</span>
            <span v-else-if="look.type?.universal" :class="[pill, pillTone.brand]">Universal</span>
          </template>
        </InventoryCard>
      </div>
      <!-- Only when there is more than one page: the count is already in the header. -->
      <Pagination
        v-if="list.total.value > list.pageSize.value"
        v-model:page="list.page.value" :page-size="list.pageSize.value" :total="list.total.value" class="mt-5" />
    </template>

    <NewScanObjectDialog v-if="canManage && orgId" v-model:open="createOpen" :org-id="orgId" @created="onCreated" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Package, Plus } from 'lucide-vue-next'
import { boxOnline, listBoxes, type BoxDto } from '@/api/museotekBox'
import { useQuery } from '@/lib/useQuery'
import { useShared } from '@/lib/queries'
import { useDataList } from '@/lib/useDataList'
import { useOrgScope } from '@/lib/useOrgScope'
import { canManageOrg } from '@/platform/authz'
import { Alert } from '@/components/ui/alert'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Select } from '@/components/ui/select'
import { SearchInput } from '@/components/ui/input'
import { Pagination } from '@/components/ui/pagination'
import { Skeleton } from '@/components/ui/skeleton'
import { cardGrid, headBtnGrad, headBtnOutline, pill, pillTone } from '@/components/experience/styles'
import ListHeader from '@/components/inventory/ListHeader.vue'
import InventoryCard from '@/components/inventory/InventoryCard.vue'
import NewBoxDialog from '@/components/inventory/NewBoxDialog.vue'

/**
 * The organisation's Boxes, drawn like the Experiences screen: the same header, cards and grid.
 * The backend does not report a Box's status yet (it stays OFFLINE), so a card says "Status not
 * reported" unless it is ONLINE, there is no status filter, and nothing is polled. Only a manager
 * of the organisation adds Boxes ("View only" for the rest).
 */
const router = useRouter()
const { orgId, orgOptions, orgNames, showPicker, context } = useOrgScope()
const canManage = computed(() => canManageOrg(context.value, orgId.value))

const { data, pending, error, refresh } = useQuery(
  () => (orgId.value ? ['boxes', orgId.value] : null),
  () => listBoxes(orgId.value),
)
const boxes = computed(() => data.value ?? [])
/** How many experiences each Box has, from what the Dashboard and the experiences list also read. */
const usage = useShared('installed', () => orgId.value || null)

const subtitle = computed(() => {
  const org = orgNames.value[orgId.value]
  const n = boxes.value.length
  return `${org ? org + ' · ' : ''}${n} box${n === 1 ? '' : 'es'}`
})

/** The line under a card's name: its serial, and how many experiences it has once that is known. */
function cardLine(b: BoxDto) {
  const serial = `Serial ${b.serialNumber}`
  if (!usage.data.value) return serial
  const n = usage.data.value.onBox[b.id] ?? 0
  return `${serial} · ${n} experience${n === 1 ? '' : 's'}`
}

const list = useDataList<BoxDto>(data, {
  searchFields: (b) => [b.name, b.serialNumber],
  sortValues: { name: (b) => b.name },
  initialSort: { key: 'name', direction: 'asc' },
  pageSize: 12,
})

// ── New box (the shared dialog); once made, it opens ──
const createOpen = ref(false)
function startCreate() {
  createOpen.value = true
}
function onCreated(b: BoxDto) {
  router.push(`/boxes/${orgId.value}/${b.id}`)
}
</script>

<template>
  <div>
    <ListHeader title="Boxes" :subtitle="orgId ? subtitle : undefined" :view-only="!!orgId && !canManage">
      <template #actions>
        <Select v-if="showPicker" v-model="orgId" :options="orgOptions" class="w-52" aria-label="Organisation" />
        <button v-if="canManage" type="button" :class="headBtnGrad" @click="startCreate"><Plus class="h-4 w-4" />New box</button>
      </template>
    </ListHeader>

    <!-- A search box sized for a name, as on Scan objects; there is no status to filter by yet.
         Hidden while there is no Box at all to search. -->
    <div v-if="boxes.length" class="mb-5 flex">
      <SearchInput
        v-model="list.search.value"
        label="Search Boxes by name or serial number"
        placeholder="Search name or serial…"
        class="min-w-0 sm:max-w-xs"
      />
    </div>

    <Alert v-if="error" variant="error" title="Couldn't load the Boxes">
      {{ error }}
      <button type="button" :class="[headBtnOutline, 'mt-3']" @click="refresh()">Try again</button>
    </Alert>

    <div v-else-if="pending" :class="cardGrid">
      <div v-for="n in 3" :key="n" class="overflow-hidden rounded-lg border border-border bg-card shadow-xs">
        <Skeleton class="h-16 w-full rounded-none" />
        <div class="space-y-3 p-4">
          <Skeleton class="h-4 w-32" />
          <Skeleton class="h-4 w-20" />
        </div>
      </div>
    </div>

    <!-- Nothing yet: what a Box is, and the first step for whoever can take it. -->
    <Card v-else-if="!boxes.length">
      <EmptyState
        title="No Boxes yet"
        :description="`Boxes are the devices in your rooms where visitors play experiences.${canManage ? ' Add one with the serial number printed on it.' : ' Your organisation manager adds Boxes.'}`"
        :icon="Package"
        tone="brand"
      >
        <template v-if="canManage" #action>
          <button type="button" :class="headBtnGrad" @click="startCreate"><Plus class="h-4 w-4" />New box</button>
        </template>
      </EmptyState>
    </Card>

    <!-- Some exist, but the search hides them all. -->
    <Card v-else-if="!list.rows.value.length">
      <EmptyState title="Nothing matches" description="Try another search." :icon="Package">
        <template #action>
          <button type="button" :class="headBtnOutline" @click="list.reset()">Clear search</button>
        </template>
      </EmptyState>
    </Card>

    <template v-else>
      <div :class="cardGrid">
        <InventoryCard
          v-for="b in list.rows.value"
          :key="b.id"
          :to="`/boxes/${orgId}/${b.id}`"
          :title="b.name"
          :subtitle="cardLine(b)"
          :icon="Package"
          compact
        >
          <template #pills>
            <span v-if="boxOnline(b.status)" :class="[pill, pillTone.success]"><span class="h-1.5 w-1.5 rounded-full bg-success" />Online</span>
            <span v-else :class="[pill, pillTone.neutral]">Status not reported</span>
          </template>
        </InventoryCard>
      </div>
      <!-- Only when there is more than one page: the count is already in the header. -->
      <Pagination
        v-if="list.total.value > list.pageSize.value"
        v-model:page="list.page.value" :page-size="list.pageSize.value" :total="list.total.value" class="mt-5" />
    </template>

    <NewBoxDialog v-if="canManage && orgId" v-model:open="createOpen" :org-id="orgId" @created="onCreated" />
  </div>
</template>

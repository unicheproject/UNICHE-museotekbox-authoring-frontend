<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { boxOnline, deleteBox, getBox, getProject, updateBox } from '@/api/museotekBox'
import { useMutation, useQuery } from '@/lib/useQuery'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/ui/page-header'
import { Alert } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { FormField } from '@/components/ui/form'
import { ConfirmDialog, FormDialog } from '@/components/ui/dialog'

const route = useRoute()
const router = useRouter()

const orgId = computed(() => route.params.orgId as string)
const boxId = computed(() => Number(route.params.boxId))

const { data: box, pending, error, refresh } = useQuery(
  () => ['box', orgId.value, boxId.value],
  () => getBox(orgId.value, boxId.value),
)

// Same reasoning as the list: live state, polled only while the tab is actually being watched.
const timer = window.setInterval(() => {
  if (!document.hidden) void refresh()
}, 10_000)
onUnmounted(() => window.clearInterval(timer))

/** Resolve the running experience's name; the box carries only its id. */
const { data: runningProject } = useQuery(
  () => (box.value?.currentProjectId ? ['project', box.value.currentProjectId] : null),
  () => getProject(box.value!.currentProjectId!),
)

const saved = ref(false)

// ── Rename ──
const editOpen = ref(false)
const name = ref('')
const serialNumber = ref('')
const update = useMutation(updateBox, { invalidates: ['box', 'boxes'] })

function startEdit() {
  if (!box.value) return
  name.value = box.value.name ?? ''
  serialNumber.value = box.value.serialNumber ?? ''
  update.reset()
  editOpen.value = true
}

async function submitEdit() {
  const outcome = await update.mutate(orgId.value, boxId.value, {
    name: name.value.trim(),
    serialNumber: serialNumber.value.trim(),
  })
  if (outcome.ok) {
    editOpen.value = false
    saved.value = true
  }
}

// ── Delete ──
const deleteOpen = ref(false)
const remove = useMutation(deleteBox, { invalidates: ['box', 'boxes'] })

async function confirmDelete() {
  const outcome = await remove.mutate(orgId.value, boxId.value)
  if (outcome.ok) router.push('/boxes')
}
</script>

<template>
  <div>
    <PageHeader :title="box?.name ?? 'Box'" back-label="Boxes" back-to="/boxes">
      <template v-if="box" #meta>
        <Badge :variant="boxOnline(box.status) ? 'success' : 'neutral'" dot>
          {{ boxOnline(box.status) ? 'Online' : box.status || 'Unknown' }}
        </Badge>
      </template>
      <template v-if="box" #actions>
        <Button variant="outline" size="sm" @click="startEdit">Edit</Button>
      </template>
    </PageHeader>

    <div class="space-y-6">
      <Alert v-if="error" variant="error" title="Couldn't load this box">{{ error }}</Alert>

      <Card v-else-if="pending">
        <CardHeader><Skeleton class="h-6 w-56" /></CardHeader>
        <CardContent class="space-y-2">
          <Skeleton class="h-4 w-64" />
          <Skeleton class="h-4 w-40" />
        </CardContent>
      </Card>

      <template v-else-if="box">
        <Alert v-if="saved" variant="success" dismissible @dismiss="saved = false">
          Changes saved.
        </Alert>

        <Card>
          <CardContent class="p-6">
            <dl class="grid gap-4 text-sm sm:grid-cols-2">
              <div>
                <dt class="text-xs font-bold uppercase tracking-overline text-muted-foreground">
                  Serial number
                </dt>
                <dd class="mt-1 font-mono text-xs">{{ box.serialNumber || '—' }}</dd>
              </div>
              <div>
                <dt class="text-xs font-bold uppercase tracking-overline text-muted-foreground">
                  Running experience
                </dt>
                <dd class="mt-1">
                  <RouterLink
                    v-if="box.currentProjectId"
                    :to="`/experiences/${box.currentProjectId}`"
                    class="font-semibold text-brand-deep hover:underline"
                  >
                    {{ runningProject?.name ?? box.currentProjectId }}
                  </RouterLink>
                  <span v-else class="text-muted-foreground">Nothing running</span>
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader class="pb-3"><CardTitle class="text-base">Danger zone</CardTitle></CardHeader>
          <CardContent class="space-y-3">
            <p class="text-sm text-muted-foreground">
              Deleting a box removes it from this organisation. This cannot be undone here.
            </p>
            <Button variant="destructive" @click="deleteOpen = true">Delete box</Button>
          </CardContent>
        </Card>
      </template>

      <FormDialog
        v-model:open="editOpen"
        title="Edit box"
        submit-label="Save changes"
        :busy="update.loading.value"
        :error="update.error.value"
        :submit-disabled="!name.trim() || !serialNumber.trim()"
        @submit="submitEdit"
      >
        <FormField label="Name" required :error="update.fieldErrors.value.name">
          <template #default="{ id, invalid, describedBy }">
            <Input :id="id" v-model="name" :invalid="invalid" :aria-describedby="describedBy" />
          </template>
        </FormField>
        <FormField label="Serial number" required :error="update.fieldErrors.value.serialNumber">
          <template #default="{ id, invalid, describedBy }">
            <Input
              :id="id"
              v-model="serialNumber"
              :invalid="invalid"
              :aria-describedby="describedBy"
            />
          </template>
        </FormField>
      </FormDialog>

      <ConfirmDialog
        v-model:open="deleteOpen"
        title="Delete this box?"
        description="It will be removed from the organisation. This cannot be undone here."
        :busy="remove.loading.value"
        :error="remove.error.value"
          @confirm="confirmDelete"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Nfc } from 'lucide-vue-next'
import {
  KIND_LABEL,
  deleteScanObject,
  errorStatus,
  getScanObject,
  resolveScanObjectKind,
  updateScanObject,
} from '@/api/museotekBox'
import { useMutation, useQuery } from '@/lib/useQuery'
import {
  scanObjectFormComplete,
  scanObjectToForm,
  toScanObjectRequest,
  type ScanObjectFormModel,
} from '@/lib/scanObjectForm'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/ui/page-header'
import { Alert } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { FormField } from '@/components/ui/form'
import { ConfirmDialog, FormDialog } from '@/components/ui/dialog'
import ScanObjectFormFields from '@/components/scan/ScanObjectFormFields.vue'

const route = useRoute()
const router = useRouter()

const orgId = computed(() => route.params.orgId as string)
const scanObjectId = computed(() => Number(route.params.scanObjectId))

const { data: object, pending, error } = useQuery(
  () => ['scan-object', orgId.value, scanObjectId.value],
  () => getScanObject(orgId.value, scanObjectId.value),
)

/**
 * Which of the four endpoints this object belongs to. If the backend reports a kind we cannot
 * place, every write is disabled rather than sent to a guessed endpoint — writing a card through
 * the drafts endpoint would silently drop its colour.
 */
const kind = computed(() => (object.value ? resolveScanObjectKind(object.value.kind) : null))
const kindName = computed(() =>
  kind.value ? KIND_LABEL[kind.value] : (object.value?.kind || 'Unknown'),
)

const saved = ref<string | null>(null)

// ── Edit ──
const editOpen = ref(false)
const form = ref<ScanObjectFormModel | null>(null)
const update = useMutation(updateScanObject, { invalidates: ['scan-object', 'scan-objects'] })

function startEdit() {
  if (!object.value || !kind.value) return
  form.value = scanObjectToForm(object.value, kind.value)
  update.reset()
  editOpen.value = true
}

async function submitEdit() {
  if (!form.value || !kind.value) return
  const outcome = await update.mutate(
    orgId.value,
    kind.value,
    scanObjectId.value,
    toScanObjectRequest(form.value),
  )
  if (outcome.ok) {
    editOpen.value = false
    saved.value = 'Changes saved.'
  }
}

// ── RFID ──
const rfidOpen = ref(false)
const rfidTag = ref('')

/**
 * Binding and unbinding go through the kind's PATCH endpoint, since the backend exposes no
 * dedicated RFID operation. A 409 means the tag belongs to another object — the one failure the
 * user can actually act on, so it gets its own wording instead of the backend's generic message.
 */
const rfid = useMutation(updateScanObject, {
  invalidates: ['scan-object', 'scan-objects'],
  describe: (e) =>
    errorStatus(e) === 409
      ? 'That RFID tag is already bound to another scan object. Unbind it there first.'
      : null,
})

function startRfid() {
  rfidTag.value = object.value?.rfidTag ?? ''
  rfid.reset()
  rfidOpen.value = true
}

/** `tag: null` clears the binding; the full field set goes with it so nothing else changes. */
async function writeTag(tag: string | null) {
  if (!object.value || !kind.value) return
  const body = toScanObjectRequest({
    ...scanObjectToForm(object.value, kind.value),
    rfidTag: tag ?? '',
  })
  const outcome = await rfid.mutate(orgId.value, kind.value, scanObjectId.value, body)
  if (outcome.ok) {
    rfidOpen.value = false
    saved.value = tag ? `RFID tag ${tag} is now bound to this object.` : 'RFID tag unbound.'
  }
}

// ── Delete ──
const deleteOpen = ref(false)
const remove = useMutation(deleteScanObject, { invalidates: ['scan-object', 'scan-objects'] })

async function confirmDelete() {
  const outcome = await remove.mutate(orgId.value, scanObjectId.value)
  if (outcome.ok) router.push('/scan-objects')
}
</script>

<template>
  <div>
    <PageHeader
      :title="object?.name ?? 'Scan object'"
      back-label="Scan objects"
      back-to="/scan-objects"
    >
      <template v-if="object" #meta>
        <Badge variant="purple">{{ kindName }}</Badge>
        <Badge :variant="object.reusable ? 'success' : 'neutral'" dot>
          {{ object.reusable ? 'Reusable' : 'Single use' }}
        </Badge>
      </template>
      <template v-if="object" #actions>
        <Button variant="outline" size="sm" :disabled="!kind" @click="startEdit">Edit</Button>
      </template>
    </PageHeader>

    <div class="space-y-6">
      <Alert v-if="error" variant="error" title="Couldn't load this scan object">{{ error }}</Alert>

      <Card v-else-if="pending">
        <CardHeader><Skeleton class="h-6 w-56" /></CardHeader>
        <CardContent class="space-y-2">
          <Skeleton class="h-4 w-64" />
          <Skeleton class="h-4 w-40" />
        </CardContent>
      </Card>

      <template v-else-if="object">
        <Alert v-if="saved" variant="success" dismissible @dismiss="saved = null">{{ saved }}</Alert>

        <Alert v-if="!kind" variant="warning" title="Unrecognised kind">
          The backend reports this object's kind as “{{ object.kind }}”, which this app does not know
          how to edit. Editing and RFID changes are disabled to avoid writing it to the wrong
          endpoint.
        </Alert>

        <Card>
          <CardContent class="p-6">
            <dl class="grid gap-4 text-sm sm:grid-cols-2">
              <div>
                <dt class="text-xs font-bold uppercase tracking-overline text-muted-foreground">
                  Scan object type
                </dt>
                <dd class="mt-1">
                  <span v-if="object.scanObjectTypeId !== null">Type {{ object.scanObjectTypeId }}</span>
                  <span v-else class="text-muted-foreground">None</span>
                </dd>
              </div>
              <div v-if="object.colour">
                <dt class="text-xs font-bold uppercase tracking-overline text-muted-foreground">
                  Colour
                </dt>
                <dd class="mt-1">{{ object.colour }}</dd>
              </div>
              <div v-if="object.imageUrl" class="sm:col-span-2">
                <dt class="text-xs font-bold uppercase tracking-overline text-muted-foreground">
                  Image reference
                </dt>
                <dd class="mt-1 break-all font-mono text-xs text-muted-foreground">
                  {{ object.imageUrl }}
                </dd>
              </div>
              <div v-if="object.modelRef" class="sm:col-span-2">
                <dt class="text-xs font-bold uppercase tracking-overline text-muted-foreground">
                  Model reference
                </dt>
                <dd class="mt-1 break-all font-mono text-xs text-muted-foreground">
                  {{ object.modelRef }}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader class="pb-3"><CardTitle class="text-base">RFID tag</CardTitle></CardHeader>
          <CardContent class="flex flex-wrap items-center justify-between gap-3">
            <p v-if="object.rfidTag" class="text-sm">
              Bound to <span class="font-mono font-bold">{{ object.rfidTag }}</span>
            </p>
            <p v-else class="text-sm text-muted-foreground">No tag is bound to this object.</p>
            <Button variant="secondary" size="sm" :disabled="!kind" @click="startRfid">
              <Nfc class="h-3.5 w-3.5" />
              {{ object.rfidTag ? 'Change or unbind' : 'Bind a tag' }}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader class="pb-3"><CardTitle class="text-base">Danger zone</CardTitle></CardHeader>
          <CardContent class="space-y-3">
            <p class="text-sm text-muted-foreground">
              Deleting a scan object cannot be undone from this app.
            </p>
            <Button variant="destructive" @click="deleteOpen = true">Delete scan object</Button>
          </CardContent>
        </Card>
      </template>

      <FormDialog
        v-model:open="editOpen"
        title="Edit scan object"
        submit-label="Save changes"
        :busy="update.loading.value"
        :error="update.error.value"
        :submit-disabled="!form || !scanObjectFormComplete(form)"
        @submit="submitEdit"
      >
        <ScanObjectFormFields
          v-if="form"
          v-model="form"
          :field-errors="update.fieldErrors.value"
          kind-locked
      />
    </FormDialog>

    <FormDialog
      v-model:open="rfidOpen"
      title="RFID tag"
      submit-label="Bind tag"
      :busy="rfid.loading.value"
      :error="rfid.error.value"
      :submit-disabled="!rfidTag.trim()"
      @submit="writeTag(rfidTag.trim())"
    >
      <FormField label="Tag" :error="rfid.fieldErrors.value.rfidTag">
        <template #default="{ id, invalid, describedBy }">
          <Input
            :id="id"
            v-model="rfidTag"
            :invalid="invalid"
            :aria-describedby="describedBy"
            placeholder="e.g. 04A2B3C4D5"
          />
        </template>
      </FormField>

      <div v-if="object?.rfidTag" class="border-t pt-4">
        <p class="mb-2 text-xs text-muted-foreground">
          This object is currently bound to
          <span class="font-mono font-bold">{{ object.rfidTag }}</span>.
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          :disabled="rfid.loading.value"
          @click="writeTag(null)"
        >
          Unbind this tag
        </Button>
      </div>
    </FormDialog>

    <ConfirmDialog
      v-model:open="deleteOpen"
      title="Delete this scan object?"
      description="It will be removed from the organisation. This cannot be undone here."
      :busy="remove.loading.value"
      :error="remove.error.value"
        @confirm="confirmDelete"
      />
    </div>
  </div>
</template>

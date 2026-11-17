<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Nfc } from 'lucide-vue-next'
import {
  deleteScanObject,
  getScanObject,
  resolveScanObjectKind,
  updateScanObject,
  type ScanObjectTypeDto,
} from '@/api/museotekBox'
import { useMutation, useQuery } from '@/lib/useQuery'
import { useShared } from '@/lib/queries'
import { canManageOrg } from '@/platform/authz'
import { useAuthzStore } from '@/stores/authz'
import {
  scanObjectFormComplete,
  scanObjectToForm,
  toScanObjectRequest,
  type ScanObjectFormModel,
} from '@/lib/scanObjectForm'
import { Alert } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { FormField } from '@/components/ui/form'
import { ConfirmDialog } from '@/components/ui/dialog'
import { bigInput, btnOutline, rowRemove } from '@/components/authoring/ui/styles'
import { headBtnOutline, pill, pillTone } from '@/components/experience/styles'
import MoreSettings from '@/components/authoring/ui/MoreSettings.vue'
import AIcon from '@/components/authoring/AIcon.vue'
import ScanObjectFormFields from '@/components/scan/ScanObjectFormFields.vue'
import DetailHeader from '@/components/inventory/DetailHeader.vue'
import FormShell from '@/components/inventory/FormShell.vue'
import { scanObjectLook } from '@/components/inventory/scanLook'

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

const authz = useAuthzStore()
void authz.load()
/** Only a manager of the organisation changes scan objects; everyone else sees them ("View only"). */
const canManage = computed(() => canManageOrg(authz.context, orgId.value))

const cardTypes = useShared('cardTypes', () => orgId.value)
const typeById = computed<Record<number, ScanObjectTypeDto>>(() =>
  Object.fromEntries((cardTypes.data.value ?? []).map((t) => [t.id, t])),
)
const look = computed(() => (object.value ? scanObjectLook(object.value, typeById.value) : null))

const saved = ref<string | null>(null)

/** The small uppercase label of a fact. */
const dt = 'text-xs font-bold uppercase tracking-overline text-muted-foreground'

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
 * dedicated RFID operation. A tag already bound elsewhere (409 DUPLICATE_RFID_TAG, unique across
 * organisations) is explained under the Tag field by the shared error wording.
 */
const rfid = useMutation(updateScanObject, {
  invalidates: ['scan-object', 'scan-objects'],
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
    <Alert v-if="error" variant="error" title="Couldn't load this scan object">{{ error }}</Alert>

    <div v-else-if="pending" class="max-w-5xl space-y-4">
      <div class="rounded-lg bg-white px-5 py-5 shadow-xs sm:px-6">
        <Skeleton class="h-4 w-40" />
        <Skeleton class="mt-3 h-7 w-64" />
      </div>
      <Skeleton class="h-32 w-full" />
    </div>

    <!-- Capped like a Box's page (the same width), so the few facts of an object do not stretch across a wide screen. -->
    <div v-else-if="object && look" class="max-w-5xl">
      <DetailHeader crumb="Scan objects" crumb-to="/scan-objects" :title="object.name">
        <template #lead>
          <!-- The object as its card in the list draws it: its own colour, or the soft brand tint. -->
          <span
            class="flex h-12 w-12 items-center justify-center rounded-lg border border-border"
            :class="look.colour ? '' : 'bg-brand-deep/[.06]'"
            :style="look.colour ? { background: look.colour } : undefined"
            aria-hidden="true"
          >
            <component
              :is="look.icon"
              class="h-6 w-6"
              :class="look.darkIcon ? 'text-foreground/70' : look.colour ? 'text-white' : 'text-brand-deep'"
            />
          </span>
        </template>
        <template #pills>
          <span class="text-[13px] text-muted-foreground">{{ look.kindLabel }}</span>
          <span v-if="look.type?.exit" :class="[pill, pillTone.warning]">Exit</span>
          <span v-else-if="look.type?.universal" :class="[pill, pillTone.brand]">Universal</span>
          <span v-if="!object.rfidTag" :class="[pill, pillTone.outline]">Not tagged</span>
        </template>
        <template #actions>
          <button v-if="canManage" type="button" :class="headBtnOutline" :disabled="!kind" @click="startEdit">Edit</button>
          <span v-else :class="[pill, pillTone.neutral]">View only</span>
        </template>
      </DetailHeader>

      <div class="space-y-5">
        <Alert v-if="saved" variant="success" dismissible @dismiss="saved = null">{{ saved }}</Alert>
        <Alert v-if="!kind" variant="warning" title="Unrecognised kind">
          The backend reports this object's kind as “{{ object.kind }}”, which this app does not know how to edit.
          Editing and RFID changes are turned off so nothing is written to the wrong place.
        </Alert>

        <!-- One card of facts; the RFID tag is a row of it, with its action beside it. -->
        <section class="rounded-lg bg-white shadow-xs" aria-labelledby="so-details">
          <h2 id="so-details" class="border-b border-border px-5 py-4 text-[15px] font-extrabold sm:px-6">Details</h2>
          <dl class="grid gap-x-6 gap-y-5 px-5 py-5 text-[14px] sm:grid-cols-2 sm:px-6">
            <div>
              <dt :class="dt">Kind</dt>
              <dd class="mt-1 font-semibold">{{ look.kindLabel }}</dd>
            </div>
            <div>
              <dt :class="dt">Card type</dt>
              <dd class="mt-1 font-semibold">
                <template v-if="look.typeName">{{ look.typeName }}</template>
                <span v-else class="font-normal text-muted-foreground">None</span>
              </dd>
            </div>
            <div v-if="object.colour">
              <dt :class="dt">Colour</dt>
              <dd class="mt-1 inline-flex items-center gap-2 font-semibold">
                <span class="h-4 w-4 rounded-full border border-border" :style="{ background: look.colour ?? undefined }" />
                {{ object.colour.charAt(0) + object.colour.slice(1).toLowerCase() }}
              </dd>
            </div>
            <div v-if="object.imageUrl" class="sm:col-span-2">
              <dt :class="dt">Image reference</dt>
              <dd class="mt-1 break-all font-mono text-xs text-muted-foreground">{{ object.imageUrl }}</dd>
            </div>
            <div v-if="object.modelRef" class="sm:col-span-2">
              <dt :class="dt">Model reference</dt>
              <dd class="mt-1 break-all font-mono text-xs text-muted-foreground">{{ object.modelRef }}</dd>
            </div>
          </dl>
          <div class="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-4 sm:px-6">
            <div class="text-[14px]">
              <div :class="dt">RFID tag</div>
              <p v-if="object.rfidTag" class="mt-1 font-mono font-bold">{{ object.rfidTag }}</p>
              <p v-else class="mt-1 text-muted-foreground">No tag is bound to this object.</p>
            </div>
            <button v-if="canManage" type="button" :class="headBtnOutline" :disabled="!kind" @click="startRfid">
              <Nfc class="h-3.5 w-3.5" />{{ object.rfidTag ? 'Change or unbind' : 'Bind a tag' }}
            </button>
          </div>
        </section>

        <MoreSettings v-if="canManage">
          <button
            type="button"
            :class="[btnOutline, '!py-2.5 !text-[13px] hover:!border-destructive hover:!text-destructive']"
            @click="deleteOpen = true"
          >
            <AIcon name="trash" />Delete this scan object
          </button>
        </MoreSettings>
      </div>
    </div>

    <FormShell
      v-if="canManage"
      v-model:open="editOpen"
      title="Edit scan object"
      submit-label="Save changes"
      :busy="update.loading.value"
      :error="update.error.value"
      :submit-disabled="!form || !scanObjectFormComplete(form)"
      @submit="submitEdit"
    >
      <ScanObjectFormFields v-if="form" v-model="form" :org-id="orgId" :field-errors="update.fieldErrors.value" kind-locked />
    </FormShell>

    <FormShell
      v-if="canManage"
      v-model:open="rfidOpen"
      :title="object?.rfidTag ? 'Change or unbind the RFID tag' : 'Bind an RFID tag'"
      sub="A tag can be bound to one scan object only, in any organisation."
      submit-label="Bind tag"
      :busy="rfid.loading.value"
      :error="rfid.error.value"
      :submit-disabled="!rfidTag.trim() || rfidTag.trim().length > 255"
      @submit="writeTag(rfidTag.trim())"
    >
      <FormField label="Tag" :error="rfidTag.trim().length > 255 ? 'At most 255 characters' : rfid.fieldErrors.value.rfidTag">
        <template #default="{ id, invalid, describedBy }">
          <input
            :id="id"
            v-model="rfidTag"
            :class="[bigInput, 'font-mono', invalid && '!border-destructive']"
            :aria-describedby="describedBy"
            placeholder="e.g. 04A2B3C4D5"
            autocomplete="off"
          />
        </template>
      </FormField>
      <div v-if="object?.rfidTag" class="border-t border-border pt-4">
        <p class="mb-2 text-[13px] text-muted-foreground">
          This object is bound to <span class="font-mono font-bold">{{ object.rfidTag }}</span> now.
        </p>
        <!-- A quiet secondary action, so it does not read as a second Cancel beside the foot. -->
        <button
          type="button"
          :class="[rowRemove, '-ml-3 !text-secondary-foreground hover:!text-destructive']"
          :disabled="rfid.loading.value"
          @click="writeTag(null)"
        >
          Unbind this tag
        </button>
      </div>
    </FormShell>

    <ConfirmDialog
      v-model:open="deleteOpen"
      title="Delete this scan object?"
      description="It will be removed from the organisation. This cannot be undone here."
      :busy="remove.loading.value"
      :error="remove.error.value"
      @confirm="confirmDelete"
    />
  </div>
</template>

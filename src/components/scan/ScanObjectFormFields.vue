<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { ChevronDown, Plus } from 'lucide-vue-next'
import { CARD_COLOURS, KIND_LABEL, SCAN_OBJECT_KINDS, createScanObjectType, type ScanObjectTypeDto } from '@/api/museotekBox'
import type { SelectOption } from '@/components/ui/select'
import { FormField } from '@/components/ui/form'
import { bigInput, btnDeep, btnOutline } from '@/components/authoring/ui/styles'
import { useShared } from '@/lib/queries'
import { useMutation } from '@/lib/useQuery'
import { canManageOrg } from '@/platform/authz'
import { useAuthzStore } from '@/stores/authz'
import { scanObjectFormErrors, type ScanObjectFormModel } from '@/lib/scanObjectForm'

/**
 * The fields of a scan object, shared by the create and the edit dialog.
 *
 * Which fields appear follows the chosen kind, because the backend has a separate endpoint and a
 * separate body per kind: a card carries a colour, a printed image an image reference, a 3D object
 * a model reference, and a draft neither.
 *
 * The card type is picked from the organisation's types by name. A manager can make a new one
 * right here ("+ New type…", Plain / Universal / Exit): card types have no screen of their own, so
 * this is how a new organisation gets its first. The new type is chosen at once. `reusable` is not
 * shown: the backend no longer uses it (the form model still carries it, so an edit keeps the
 * stored value).
 */
const props = defineProps<{
  /** The organisation whose card types are offered. */
  orgId: string
  /** Per-field messages from `useMutation`. */
  fieldErrors?: Record<string, string>
  /** Editing cannot change kind: each kind has its own endpoint, with no move between them. */
  kindLocked?: boolean
  /** Hidden while editing, where a dedicated dialog owns the tag. */
  showRfid?: boolean
}>()

const form = defineModel<ScanObjectFormModel>({ required: true })

/**
 * The form's own checks show once the field has been left (so an empty new form is not all red),
 * except a too-long value, which shows at once. The backend's messages always win.
 */
const touched = reactive(new Set<string>())
const errors = computed(() => {
  const own = scanObjectFormErrors(form.value)
  const shown: Record<string, string> = {}
  for (const [field, message] of Object.entries(own)) {
    if (touched.has(field) || message.startsWith('At most')) shown[field] = message
  }
  return { ...shown, ...(props.fieldErrors ?? {}) }
})
const leave = (field: string) => touched.add(field)

const types = useShared('cardTypes', () => props.orgId)
const typeLabel = (t: ScanObjectTypeDto) => (t.exit ? `${t.name} · Exit` : t.universal ? `${t.name} · Universal` : t.name)
const typeOptions = computed<SelectOption[]>(() => {
  const list = [...(types.data.value ?? [])].sort((a, b) => a.name.localeCompare(b.name))
  const options = [{ value: '', label: 'No card type' }, ...list.map((t) => ({ value: String(t.id), label: typeLabel(t) }))]
  // A type the list does not have (deleted meanwhile, or still loading) stays selectable as itself.
  const current = form.value.scanObjectTypeId
  if (current && !list.some((t) => String(t.id) === current)) {
    options.push({ value: current, label: types.pending.value ? 'Loading…' : `Type #${current} (not found)` })
  }
  return options
})

// ── + New type… (managers only; the backend re-checks) ──
const { context } = storeToRefs(useAuthzStore())
const canAddType = computed(() => canManageOrg(context.value, props.orgId))
type TypeKind = 'plain' | 'universal' | 'exit'
const TYPE_KINDS: { id: TypeKind; name: string; blurb: string }[] = [
  { id: 'plain', name: 'Plain', blurb: 'Starts or answers where an experience uses it.' },
  { id: 'universal', name: 'Universal', blurb: 'Works anywhere in any experience.' },
  { id: 'exit', name: 'Exit', blurb: 'Ends the visit. One per organisation.' },
]
const hasExit = computed(() => (types.data.value ?? []).some((t) => t.exit))
const addingType = ref(false)
const typeName = ref('')
const typeKind = ref<TypeKind>('plain')
// The editor's own copy of the types (scan types) changes too, so both are refreshed.
const createType = useMutation(createScanObjectType, { invalidates: ['card-types', 'scan-types'] })
function startType() {
  typeName.value = ''
  typeKind.value = 'plain'
  createType.reset()
  addingType.value = true
}
async function submitType() {
  const name = typeName.value.trim()
  if (!name) return
  const outcome = await createType.mutate(props.orgId, {
    name,
    universal: typeKind.value === 'universal',
    exit: typeKind.value === 'exit',
  })
  if (outcome.ok && outcome.data) {
    form.value.scanObjectTypeId = String(outcome.data.id)
    addingType.value = false
  }
}

const kindOptions: SelectOption[] = SCAN_OBJECT_KINDS.map((kind) => ({
  value: kind,
  label: KIND_LABEL[kind],
}))

const colourOptions: SelectOption[] = CARD_COLOURS.map((colour) => ({
  value: colour,
  // "RED" is shouted at the user otherwise; the enum value still goes over the wire.
  label: colour.charAt(0) + colour.slice(1).toLowerCase(),
}))

/** The authoring screens' big input, red when the field has a problem. */
const field = (invalid: boolean) => [bigInput, invalid && '!border-destructive focus:!ring-destructive/20']
/** A select drawn like the list screens' Select (own chevron, not the browser's), still native. */
const selectField = (invalid: boolean) => [...field(invalid), 'cursor-pointer appearance-none pr-10']
</script>

<template>
  <div class="space-y-5">
    <FormField v-if="!kindLocked" label="Kind" required :error="errors.kind">
      <template #default="{ id, invalid }">
        <div class="relative">
          <select :id="id" v-model="form.kind" :class="selectField(invalid)">
            <option v-for="o in kindOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
          </select>
          <ChevronDown class="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        </div>
      </template>
    </FormField>

    <FormField label="Name" required :error="errors.name">
      <template #default="{ id, invalid, describedBy }">
        <input
          :id="id"
          v-model="form.name"
          :class="field(invalid)"
          :aria-invalid="invalid || undefined"
          :aria-describedby="describedBy"
          placeholder="e.g. Bronze helmet card"
          autocomplete="off"
          @blur="leave('name')"
        />
      </template>
    </FormField>

    <FormField v-if="form.kind === 'COLOURED_CARD'" label="Colour" required :error="errors.colour">
      <template #default="{ id, invalid }">
        <div class="relative">
          <select :id="id" v-model="form.colour" :class="selectField(invalid)">
            <option v-for="o in colourOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
          </select>
          <ChevronDown class="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        </div>
      </template>
    </FormField>

    <FormField v-if="form.kind === 'PRINTED_IMAGE'" label="Image reference" required :error="errors.imageUrl">
      <template #default="{ id, invalid, describedBy }">
        <input
          :id="id"
          v-model="form.imageUrl"
          :class="field(invalid)"
          :aria-invalid="invalid || undefined"
          :aria-describedby="describedBy"
          placeholder="https://…"
          autocomplete="off"
          @blur="leave('imageUrl')"
        />
      </template>
    </FormField>

    <FormField v-if="form.kind === 'THREE_D_PRINTED_OBJECT'" label="Model reference" required :error="errors.modelRef">
      <template #default="{ id, invalid, describedBy }">
        <input
          :id="id"
          v-model="form.modelRef"
          :class="field(invalid)"
          :aria-invalid="invalid || undefined"
          :aria-describedby="describedBy"
          placeholder="e.g. helmet.glb"
          autocomplete="off"
          @blur="leave('modelRef')"
        />
      </template>
    </FormField>

    <FormField label="Card type" :error="errors.scanObjectTypeId ?? types.error.value ?? undefined">
      <template #default="{ id, invalid }">
        <div class="relative">
          <select :id="id" v-model="form.scanObjectTypeId" :class="selectField(invalid)">
            <option v-for="o in typeOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
          </select>
          <ChevronDown class="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        </div>
      </template>
    </FormField>

    <!-- A new card type, made inside this form (not a dialog over the dialog); chosen once made. -->
    <div v-if="canAddType" class="-mt-2">
      <button
        v-if="!addingType"
        type="button"
        class="inline-flex items-center gap-1.5 text-[13.5px] font-bold text-brand-deep hover:underline"
        @click="startType"
      >
        <Plus class="h-4 w-4" />New type…
      </button>
      <div v-else class="space-y-3 rounded-md border border-brand-deep bg-brand-deep/[.03] p-4">
        <p class="text-[14px] font-extrabold">New card type</p>
        <input
          v-model="typeName"
          :class="bigInput"
          aria-label="Card type name"
          placeholder="e.g. Red card"
          autocomplete="off"
          maxlength="255"
          @keydown.enter.prevent="submitType"
        />
        <div class="grid gap-2">
          <button
            v-for="k in TYPE_KINDS"
            :key="k.id"
            type="button"
            :aria-pressed="typeKind === k.id"
            :disabled="k.id === 'exit' && hasExit"
            class="flex flex-col items-start gap-0.5 rounded-lg border bg-white p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            :class="typeKind === k.id ? 'border-brand-deep bg-brand-deep/[.05]' : 'border-border hover:border-brand-deep/50'"
            @click="typeKind = k.id"
          >
            <span class="text-[14px] font-extrabold" :class="{ 'text-brand-deep': typeKind === k.id }">{{ k.name }}</span>
            <span class="text-[13px] text-secondary-foreground">
              {{ k.id === 'exit' && hasExit ? 'This organisation already has an Exit type.' : k.blurb }}
            </span>
          </button>
        </div>
        <p v-if="createType.error.value" role="alert" class="text-[13px] font-bold text-destructive">
          {{ createType.fieldErrors.value.exit ?? createType.error.value }}
        </p>
        <div class="flex flex-wrap gap-2">
          <button type="button" :class="[btnDeep, '!py-2.5']" :disabled="!typeName.trim() || createType.loading.value" @click="submitType">
            {{ createType.loading.value ? 'Creating…' : 'Create' }}
          </button>
          <button type="button" :class="[btnOutline, '!py-2.5']" :disabled="createType.loading.value" @click="addingType = false">Cancel</button>
        </div>
      </div>
    </div>

    <FormField v-if="showRfid" label="RFID tag" :error="errors.rfidTag">
      <template #default="{ id, invalid, describedBy }">
        <input
          :id="id"
          v-model="form.rfidTag"
          :class="[...field(invalid), 'font-mono']"
          :aria-invalid="invalid || undefined"
          :aria-describedby="describedBy"
          placeholder="Leave empty for none"
          autocomplete="off"
          @blur="leave('rfidTag')"
        />
      </template>
    </FormField>
  </div>
</template>

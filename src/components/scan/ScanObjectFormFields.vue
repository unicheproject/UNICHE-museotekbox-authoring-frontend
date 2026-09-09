<script setup lang="ts">
import { computed } from 'vue'
import { CARD_COLOURS, KIND_LABEL, SCAN_OBJECT_KINDS } from '@/api/museotekBox'
import { Input } from '@/components/ui/input'
import { Select, type SelectOption } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { FormField } from '@/components/ui/form'
import type { ScanObjectFormModel } from '@/lib/scanObjectForm'

/**
 * The fields of a scan object, shared by the create and the edit dialog.
 *
 * Which fields appear follows the chosen kind, because the backend has a separate endpoint and a
 * separate body per kind: a card carries a colour, a printed image an image reference, a 3D object
 * a model reference, and a draft neither.
 */
const props = defineProps<{
  /** Per-field messages from `useMutation`. */
  fieldErrors?: Record<string, string>
  /** Editing cannot change kind: each kind has its own endpoint, with no move between them. */
  kindLocked?: boolean
  /** Hidden while editing, where a dedicated dialog owns the tag. */
  showRfid?: boolean
}>()

const form = defineModel<ScanObjectFormModel>({ required: true })

const errors = computed(() => props.fieldErrors ?? {})

const kindOptions: SelectOption[] = SCAN_OBJECT_KINDS.map((kind) => ({
  value: kind,
  label: KIND_LABEL[kind],
}))

const colourOptions: SelectOption[] = CARD_COLOURS.map((colour) => ({
  value: colour,
  // "RED" is shouted at the user otherwise; the enum value still goes over the wire.
  label: colour.charAt(0) + colour.slice(1).toLowerCase(),
}))
</script>

<template>
  <div class="space-y-4">
    <FormField v-if="!kindLocked" label="Kind" required :error="errors.kind">
      <template #default="{ id, invalid }">
        <Select :id="id" v-model="form.kind" :options="kindOptions" :invalid="invalid" />
      </template>
    </FormField>

    <FormField label="Name" required :error="errors.name">
      <template #default="{ id, invalid, describedBy }">
        <Input
          :id="id"
          v-model="form.name"
          :invalid="invalid"
          :aria-describedby="describedBy"
          placeholder="e.g. Bronze helmet card"
        />
      </template>
    </FormField>

    <FormField
      v-if="form.kind === 'COLOURED_CARD'"
      label="Colour"
      required
      :error="errors.colour"
    >
      <template #default="{ id, invalid }">
        <Select :id="id" v-model="form.colour" :options="colourOptions" :invalid="invalid" />
      </template>
    </FormField>

    <FormField
      v-if="form.kind === 'PRINTED_IMAGE'"
      label="Image reference"
      :error="errors.imageUrl"
      hint="A URL or path to the image. The backend stores a reference, so there is no upload yet."
    >
      <template #default="{ id, invalid, describedBy }">
        <Input
          :id="id"
          v-model="form.imageUrl"
          :invalid="invalid"
          :aria-describedby="describedBy"
          placeholder="https://…"
        />
      </template>
    </FormField>

    <FormField
      v-if="form.kind === 'THREE_D_PRINTED_OBJECT'"
      label="Model reference"
      :error="errors.modelRef"
      hint="A reference to the 3D model. The backend stores a reference, so there is no upload yet."
    >
      <template #default="{ id, invalid, describedBy }">
        <Input
          :id="id"
          v-model="form.modelRef"
          :invalid="invalid"
          :aria-describedby="describedBy"
          placeholder="e.g. helmet.glb"
        />
      </template>
    </FormField>

    <FormField
      label="Scan object type"
      :error="errors.scanObjectTypeId"
      hint="The numeric id of the type. There is no endpoint listing types yet, so it cannot be picked by name."
    >
      <template #default="{ id, invalid, describedBy }">
        <Input
          :id="id"
          v-model="form.scanObjectTypeId"
          :invalid="invalid"
          :aria-describedby="describedBy"
          inputmode="numeric"
          placeholder="e.g. 3"
        />
      </template>
    </FormField>

    <FormField v-if="showRfid" label="RFID tag" :error="errors.rfidTag">
      <template #default="{ id, invalid, describedBy }">
        <Input
          :id="id"
          v-model="form.rfidTag"
          :invalid="invalid"
          :aria-describedby="describedBy"
          placeholder="Leave empty for none"
        />
      </template>
    </FormField>

    <Switch v-model="form.reusable" label="Reusable" />
  </div>
</template>

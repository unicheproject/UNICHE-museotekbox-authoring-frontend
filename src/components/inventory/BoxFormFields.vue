<script setup lang="ts">
import { computed, reactive } from 'vue'
import { FormField } from '@/components/ui/form'
import { bigInput } from '@/components/authoring/ui/styles'
import { boxFormErrors, type BoxFormModel } from '@/lib/boxForm'

/**
 * The fields of a Box, shared by New and Edit, drawn like the scan object form. The form's own
 * checks show once a field has been left (a too-long value at once); the backend's messages
 * (e.g. a serial number already used, in any organisation) always win.
 */
const props = defineProps<{ fieldErrors?: Record<string, string> }>()
const form = defineModel<BoxFormModel>({ required: true })

const touched = reactive(new Set<string>())
const errors = computed(() => {
  const shown: Record<string, string> = {}
  for (const [field, message] of Object.entries(boxFormErrors(form.value))) {
    if (touched.has(field) || message.startsWith('At most')) shown[field] = message
  }
  return { ...shown, ...(props.fieldErrors ?? {}) }
})
const field = (invalid: boolean) => [bigInput, invalid && '!border-destructive focus:!ring-destructive/20']
</script>

<template>
  <div class="space-y-5">
    <FormField label="Name" required :error="errors.name">
      <template #default="{ id, invalid, describedBy }">
        <input
          :id="id"
          v-model="form.name"
          :class="field(invalid)"
          :aria-invalid="invalid || undefined"
          :aria-describedby="describedBy"
          placeholder="e.g. Foyer box"
          autocomplete="off"
          @blur="touched.add('name')"
        />
      </template>
    </FormField>
    <FormField label="Serial number" required hint="Printed on the device." :error="errors.serialNumber">
      <template #default="{ id, invalid, describedBy }">
        <input
          :id="id"
          v-model="form.serialNumber"
          :class="[...field(invalid), 'font-mono']"
          :aria-invalid="invalid || undefined"
          :aria-describedby="describedBy"
          placeholder="e.g. MB-2026-0042"
          autocomplete="off"
          @blur="touched.add('serialNumber')"
        />
      </template>
    </FormField>
  </div>
</template>

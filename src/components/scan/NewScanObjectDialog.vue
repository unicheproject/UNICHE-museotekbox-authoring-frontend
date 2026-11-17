<script setup lang="ts">
import { ref, watch } from 'vue'
import { createScanObject, type ScanObjectDto } from '@/api/museotekBox'
import { useMutation } from '@/lib/useQuery'
import { emptyScanObjectForm, scanObjectFormComplete, toScanObjectRequest } from '@/lib/scanObjectForm'
import FormShell from '@/components/inventory/FormShell.vue'
import ScanObjectFormFields from './ScanObjectFormFields.vue'

/**
 * The "New scan object" dialog, as the Scan objects screen has always drawn it, shared with the
 * Dashboard's guide. It saves and emits `created`; what happens next (open the new object, or stay
 * where you are) is the caller's. Each opening starts from a blank Draft.
 */
const props = defineProps<{ orgId: string }>()
const open = defineModel<boolean>('open', { required: true })
const emit = defineEmits<{ created: [object: ScanObjectDto] }>()

const form = ref(emptyScanObjectForm('DRAFT'))
const create = useMutation(createScanObject, { invalidates: ['scan-objects'] })

watch(open, (isOpen) => {
  if (!isOpen) return
  form.value = emptyScanObjectForm('DRAFT')
  create.reset()
})

async function submit() {
  const outcome = await create.mutate(props.orgId, form.value.kind, toScanObjectRequest(form.value))
  if (outcome.ok && outcome.data) {
    open.value = false
    emit('created', outcome.data)
  }
}
</script>

<template>
  <FormShell
    v-model:open="open"
    title="New scan object"
    submit-label="Create"
    :busy="create.loading.value"
    :error="create.error.value"
    :submit-disabled="!scanObjectFormComplete(form)"
    @submit="submit"
  >
    <ScanObjectFormFields v-model="form" :org-id="orgId" :field-errors="create.fieldErrors.value" show-rfid />
  </FormShell>
</template>

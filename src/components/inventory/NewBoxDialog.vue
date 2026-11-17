<script setup lang="ts">
import { ref, watch } from 'vue'
import { createBox, type BoxDto } from '@/api/museotekBox'
import { useMutation } from '@/lib/useQuery'
import { boxFormComplete, emptyBoxForm, toBoxRequest } from '@/lib/boxForm'
import FormShell from './FormShell.vue'
import BoxFormFields from './BoxFormFields.vue'

/**
 * The "New Box" dialog, as the Boxes screen has always drawn it, shared with the Dashboard's guide.
 * It saves and emits `created`; what happens next (open the new Box, or stay where you are) is the
 * caller's. Each opening starts from a blank form.
 */
const props = defineProps<{ orgId: string }>()
const open = defineModel<boolean>('open', { required: true })
const emit = defineEmits<{ created: [box: BoxDto] }>()

const form = ref(emptyBoxForm())
const create = useMutation(createBox, { invalidates: ['boxes', 'installed'] })

watch(open, (isOpen) => {
  if (!isOpen) return
  form.value = emptyBoxForm()
  create.reset()
})

async function submit() {
  const outcome = await create.mutate(props.orgId, toBoxRequest(form.value))
  if (outcome.ok && outcome.data) {
    open.value = false
    emit('created', outcome.data)
  }
}
</script>

<template>
  <FormShell
    v-model:open="open"
    title="New Box"
    submit-label="Create"
    :busy="create.loading.value"
    :error="create.error.value"
    :submit-disabled="!boxFormComplete(form)"
    @submit="submit"
  >
    <BoxFormFields v-model="form" :field-errors="create.fieldErrors.value" />
  </FormShell>
</template>

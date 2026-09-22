<script setup lang="ts">
import { computed } from 'vue'
import { Input } from '@/components/ui/input'
import { Select, type SelectOption } from '@/components/ui/select'
import { FormField } from '@/components/ui/form'
import type {
  FieldValue,
  ListRow,
  QuestionRow,
  TemplateConfig,
  TemplateField,
} from '@/lib/experienceTemplates'
import TemplateListField from './TemplateListField.vue'
import TemplateQuestionsField from './TemplateQuestionsField.vue'

/** One question the template asks, drawn according to its type. */
const props = defineProps<{
  field: TemplateField
  config: TemplateConfig
  scanOptions: SelectOption[]
}>()

// The config is the shared answer object: the controls write straight into it, which is what keeps
// the whole step in step with what the author is typing.
const value = computed<FieldValue>({
  get: () => props.config[props.field.key],
  set: (next) => {
    props.config[props.field.key] = next
  },
})

const text = computed<string>({
  get: () => String(value.value ?? ''),
  set: (next) => {
    value.value = next
  },
})

const checked = computed<boolean>({
  get: () => Boolean(value.value),
  set: (next) => {
    value.value = next
  },
})

const rows = computed(() => (value.value as ListRow[]) ?? [])
const questions = computed(() => (value.value as QuestionRow[]) ?? [])

const placeholder = computed(() =>
  props.field.type === 'text' ? props.field.placeholder : undefined,
)

const selectOptions = computed<SelectOption[]>(() =>
  props.field.type === 'select'
    ? props.field.options.map((option) => ({ value: option, label: option }))
    : [],
)
</script>

<template>
  <TemplateListField
    v-if="field.type === 'list'"
    :field="field"
    :rows="rows"
    :scan-options="scanOptions"
  />

  <TemplateQuestionsField
    v-else-if="field.type === 'questions'"
    :field="field"
    :questions="questions"
    :scan-options="scanOptions"
  />

  <!-- A switch reads as a sentence, so it carries its own label rather than sitting under one. -->
  <label
    v-else-if="field.type === 'toggle'"
    class="flex cursor-pointer items-start gap-3 rounded-md border border-border p-3 transition-colors hover:bg-surface-2"
  >
    <input v-model="checked" type="checkbox" class="mt-0.5 h-4 w-4 accent-brand-deep" />
    <span class="text-[13px] font-semibold text-secondary-foreground">{{ field.label }}</span>
  </label>

  <FormField v-else :label="field.label">
    <template #default="{ id }">
      <Select
        v-if="field.type === 'scan'"
        :id="id"
        v-model="text"
        :options="scanOptions"
      />
      <Select
        v-else-if="field.type === 'select'"
        :id="id"
        v-model="text"
        :options="selectOptions"
      />
      <Input
        v-else-if="field.type === 'number'"
        :id="id"
        v-model="text"
        type="number"
        min="0"
        placeholder="—"
      />
      <Input v-else :id="id" v-model="text" :placeholder="placeholder" />
    </template>
  </FormField>
</template>

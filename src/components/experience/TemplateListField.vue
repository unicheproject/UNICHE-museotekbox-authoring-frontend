<script setup lang="ts">
import { Plus, Trash2 } from 'lucide-vue-next'
import { Input } from '@/components/ui/input'
import { Select, type SelectOption } from '@/components/ui/select'
import { emptyRow, type ListRow, type TemplateField } from '@/lib/experienceTemplates'

/**
 * The ordered rows of a `list` field — objects, clues, chapters. The rows are the substance of the
 * pattern, so they are edited in place rather than in a dialog, and the list opens with one blank
 * row for the author to type into.
 */
const props = defineProps<{
  field: Extract<TemplateField, { type: 'list' }>
  rows: ListRow[]
  /** The organisation's scan objects, with "Not chosen yet" first. */
  scanOptions: SelectOption[]
}>()

function addRow() {
  props.rows.push(emptyRow(props.field))
}

function removeRow(index: number) {
  props.rows.splice(index, 1)
}

function optionsFor(options?: string[]): SelectOption[] {
  return (options ?? []).map((option) => ({ value: option, label: option }))
}
</script>

<template>
  <div>
    <div class="mb-2 flex items-center justify-between">
      <span class="label-overline text-muted-foreground">{{ field.label }}</span>
      <span class="text-[11px] text-muted-foreground">
        {{ rows.length }}
        {{ rows.length === 1 ? field.itemLabel.toLowerCase() : `${field.itemLabel.toLowerCase()}s` }}
      </span>
    </div>

    <div class="space-y-2">
      <div
        v-for="(row, index) in rows"
        :key="index"
        class="flex items-start gap-2 rounded-md border border-border bg-surface-2/60 p-2.5"
      >
        <span
          class="mt-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-pill bg-card text-[11px] font-extrabold text-brand-deep shadow-xs"
        >
          {{ index + 1 }}
        </span>

        <div class="grid min-w-0 flex-1 gap-2 sm:grid-cols-[minmax(0,1fr)_180px]">
          <label v-for="column in field.columns" :key="column.key" class="block">
            <span class="label-overline mb-1 block text-muted-foreground">{{ column.label }}</span>
            <Select
              v-if="column.type === 'scan'"
              v-model="row[column.key]"
              :options="scanOptions"
              class="h-9 text-[13px]"
            />
            <Select
              v-else-if="column.type === 'select'"
              v-model="row[column.key]"
              :options="optionsFor(column.options)"
              class="h-9 text-[13px]"
            />
            <Input
              v-else
              v-model="row[column.key]"
              :placeholder="column.placeholder"
              class="h-9 text-[13px]"
            />
          </label>
        </div>

        <button
          type="button"
          class="mt-1.5 rounded-sm p-1.5 text-muted-foreground transition-colors hover:bg-card hover:text-destructive"
          :title="`Remove ${field.itemLabel.toLowerCase()}`"
          @click="removeRow(index)"
        >
          <Trash2 class="h-4 w-4" />
        </button>
      </div>
    </div>

    <button
      type="button"
      class="mt-2 flex items-center gap-1.5 rounded-md border border-dashed border-input px-3 py-2 text-[12px] font-bold text-brand-deep transition-colors hover:border-brand-deep hover:bg-brand-deep/[.04]"
      @click="addRow"
    >
      <Plus class="h-3.5 w-3.5" />
      Add {{ field.itemLabel.toLowerCase() }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { hasDisplay, template, type Authoring, type Cfg, type TemplateField } from '@/lib/authoring/engine'
import { inputCls } from '@/lib/authoring/html'
import AField from './AField.vue'
import AIcon from './AIcon.vue'
import MediaPicker from './MediaPicker.vue'
import SectionHead from './SectionHead.vue'
import TypeSelect from './TypeSelect.vue'

/**
 * What an activity other than the Quiz asks for: its fields in order, one section
 * each — a line of text, a number, a choice, an object, what it opens and closes with, and lists
 * of rows (objects and their stories, clues, chapters).
 */
const props = defineProps<{ a: Authoring; templateId: string; cfg: Cfg }>()
const emit = defineEmits<{ change: [] }>()

const fields = computed(() => template(props.templateId).fields)

function set(key: string, value: unknown) {
  props.cfg[key] = value
  emit('change')
}
function setCell(key: string, i: number, col: string, value: string) {
  props.cfg[key][i][col] = value
  emit('change')
}
function addRow(f: TemplateField) {
  const row: Cfg = {}
  for (const c of f.columns || []) row[c.key] = c.type === 'select' ? c.options![0] : ''
  props.cfg[f.key].push(row)
  emit('change')
}
function delRow(key: string, i: number) {
  props.cfg[key].splice(i, 1)
  emit('change')
}
const val = (e: Event) => (e.target as HTMLInputElement).value

const cellLabel = 'mb-1 block text-[10px] font-bold uppercase tracking-overline text-muted-foreground'
</script>

<template>
  <div v-for="(f, i) in fields" :key="f.key" :class="i ? 'mt-6 border-t border-border pt-6' : ''">
    <AField v-if="f.type === 'text'" :label="f.label">
      <input :value="cfg[f.key] ?? ''" :class="inputCls" @input="set(f.key, val($event))" />
    </AField>

    <AField v-else-if="f.type === 'number'" :label="f.label">
      <input
        type="number"
        min="0"
        :value="cfg[f.key] ?? ''"
        placeholder="—"
        :class="[inputCls, 'max-w-[10rem]']"
        @input="set(f.key, val($event))"
      />
    </AField>

    <AField v-else-if="f.type === 'select'" :label="f.label">
      <select :value="cfg[f.key]" :class="[inputCls, 'max-w-md']" @change="set(f.key, val($event))">
        <option v-for="o in f.options" :key="o" :value="o">{{ o }}</option>
      </select>
    </AField>

    <AField v-else-if="f.type === 'scan'" :label="f.label">
      <TypeSelect :types="a.scanTypes" :model-value="cfg[f.key]" cls="max-w-sm" @update:model-value="set(f.key, $event)" />
    </AField>

    <!-- Every activity opens the same way: something to look at or listen to. -->
    <template v-else-if="f.type === 'opening'">
      <SectionHead :title="f.label" :help="f.help" />
      <div class="max-w-xl">
        <AField v-if="hasDisplay(a)" label="Shown on the screen">
          <MediaPicker kind="VISUAL" :model-value="cfg.openingMedia ?? ''" @update:model-value="set('openingMedia', $event)" />
        </AField>
        <AField v-else label="Played on the Box">
          <MediaPicker kind="AUDIO" :model-value="cfg.openingAudio ?? ''" @update:model-value="set('openingAudio', $event)" />
        </AField>
      </div>
    </template>

    <template v-else-if="f.type === 'closing'">
      <SectionHead :title="f.label" help="The last screen of this activity. How long it stays is set on the line after it." />
      <div class="grid gap-4 sm:grid-cols-2">
        <AField v-if="hasDisplay(a)" label="Shown on the screen">
          <MediaPicker kind="VISUAL" :model-value="cfg.closingMedia ?? ''" @update:model-value="set('closingMedia', $event)" />
        </AField>
        <AField v-else label="Played on the Box">
          <MediaPicker kind="AUDIO" :model-value="cfg.closingAudio ?? ''" @update:model-value="set('closingAudio', $event)" />
        </AField>
        <AField
          v-if="'finish' in cfg"
          label="Object that ends this activity"
          help="The visitor places it when they have seen enough."
        >
          <TypeSelect :types="a.scanTypes" :model-value="cfg.finish" @update:model-value="set('finish', $event)" />
        </AField>
      </div>
    </template>

    <template v-else-if="f.type === 'list'">
      <SectionHead :title="f.label" />
      <div class="space-y-2">
        <div
          v-for="(row, r) in cfg[f.key]"
          :key="r"
          class="flex items-start gap-2 rounded-md border border-border bg-surface-2/60 p-2.5"
        >
          <span
            class="mt-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-pill bg-white text-[11px] font-extrabold text-brand-deep shadow-xs"
          >
            {{ r + 1 }}
          </span>
          <div class="grid min-w-0 flex-1 gap-2 sm:grid-cols-[minmax(0,1fr)_180px]">
            <label v-for="c in f.columns" :key="c.key" class="block" :class="c.type === 'media' ? 'sm:col-span-2' : ''">
              <span :class="cellLabel">{{ c.type === 'media' && !hasDisplay(a) ? 'Recording' : c.label }}</span>
              <MediaPicker
                v-if="c.type === 'media'"
                :kind="hasDisplay(a) ? 'VISUAL' : 'AUDIO'"
                cls="py-1.5 text-[13px]"
                :model-value="row[c.key] ?? ''"
                @update:model-value="setCell(f.key, r, c.key, $event)"
              />
              <TypeSelect
                v-else-if="c.type === 'scan'"
                :types="a.scanTypes"
                :model-value="row[c.key]"
                cls="py-1.5 text-[13px]"
                @update:model-value="setCell(f.key, r, c.key, $event)"
              />
              <select
                v-else-if="c.type === 'select'"
                :value="row[c.key]"
                :class="[inputCls, 'py-1.5 text-[13px]']"
                @change="setCell(f.key, r, c.key, val($event))"
              >
                <option v-for="o in c.options" :key="o" :value="o">{{ o }}</option>
              </select>
              <input
                v-else
                :value="row[c.key] ?? ''"
                :placeholder="c.placeholder || ''"
                :class="[inputCls, 'py-1.5 text-[13px]']"
                @input="setCell(f.key, r, c.key, val($event))"
              />
            </label>
          </div>
          <button
            type="button"
            title="Remove"
            class="mt-1.5 rounded-sm p-1.5 text-muted-foreground hover:bg-white hover:text-destructive"
            @click="delRow(f.key, r)"
          >
            <AIcon name="trash" cls="h-4 w-4" />
          </button>
        </div>
      </div>
      <button
        type="button"
        class="mt-2 flex items-center gap-1.5 rounded-md border border-dashed border-input px-3 py-2 text-[12px] font-bold text-brand-deep hover:border-brand-deep hover:bg-brand-deep/[.04]"
        @click="addRow(f)"
      >
        <AIcon name="plus" cls="h-3.5 w-3.5" /> Add {{ f.itemLabel?.toLowerCase() }}
      </button>
    </template>
  </div>
</template>

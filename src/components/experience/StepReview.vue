<script setup lang="ts">
import { computed } from 'vue'
import type { ScanObjectDto } from '@/api/museotekBox'
import {
  sceneGaps,
  usedScanObjects,
  type BuiltDocument,
  type ExperienceTemplate,
  type Scene,
} from '@/lib/experienceTemplates'
import RuleSentence from './RuleSentence.vue'
import ScanObjectChip from './ScanObjectChip.vue'

/**
 * What will be created, before it is created: the size of it, then every scene with the sentences
 * that will run on it, and what is still open.
 *
 * Nothing here blocks Create. The experience is a draft until it is published, and this list is
 * where the author picks up afterwards.
 */
const props = defineProps<{
  document: BuiltDocument
  template: ExperienceTemplate
  name: string
  organisation: string
  objects: ScanObjectDto[]
}>()

defineEmits<{ (e: 'edit'): void }>()

const scenes = computed(() => props.document.scenes)
const ruleCount = computed(() => scenes.value.reduce((total, scene) => total + scene.rules.length, 0))
const cards = computed(() => usedScanObjects(props.document))
const gapsOf = (scene: Scene) => sceneGaps(props.document, scene)
const gapTotal = computed(() => scenes.value.reduce((total, scene) => total + gapsOf(scene).length, 0))

const summary = computed(() => [
  { label: 'Name', value: props.name.trim() || 'Untitled experience' },
  { label: 'Organisation', value: props.organisation },
  { label: 'Template', value: props.template.name },
])

const stats = computed(() => [
  { label: 'Scenes', value: scenes.value.length },
  { label: 'Rules', value: ruleCount.value },
  { label: 'Objects', value: cards.value.length },
])

const SCENE_COLOUR: Record<string, string> = {
  intro: '#4c1d8b',
  story: '#b05fd6',
  question: '#2d5aa0',
  feedback: '#9a6200',
  outro: '#0f7a6e',
}
</script>

<template>
  <div>
    <div class="mb-5 flex items-center justify-between gap-3">
      <h2 class="text-base font-extrabold">What will be created</h2>
      <button
        type="button"
        class="text-[12px] font-bold text-brand-deep hover:underline"
        @click="$emit('edit')"
      >
        Edit answers
      </button>
    </div>

    <div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div class="space-y-4">
        <!-- the size of it, before the detail -->
        <div class="grid grid-cols-3 gap-3">
          <div
            v-for="stat in stats"
            :key="stat.label"
            class="rounded-lg border border-border bg-card py-4 text-center shadow-xs"
          >
            <div class="text-2xl font-extrabold text-brand-deep">{{ stat.value }}</div>
            <div class="label-overline mt-0.5 text-muted-foreground">{{ stat.label }}</div>
          </div>
        </div>

        <!-- every scene, and the sentences that will run on it -->
        <div class="rounded-lg border border-border bg-card shadow-xs">
          <div class="border-b border-border px-5 py-3.5">
            <span class="text-[14px] font-extrabold">Scene by scene</span>
          </div>
          <div class="space-y-3 p-5">
            <div
              v-for="scene in scenes"
              :key="scene.key"
              class="rounded-md border border-border bg-surface-2/50 p-4"
            >
              <div class="flex flex-wrap items-center gap-2">
                <span class="rounded-sm bg-card px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                  {{ scene.key }}
                </span>
                <span
                  class="h-2.5 w-2.5 shrink-0 rounded-pill"
                  :style="{ background: SCENE_COLOUR[scene.kind] ?? '#9ca3af' }"
                />
                <span class="text-[13.5px] font-extrabold">{{ scene.name }}</span>
                <span
                  v-if="scene.start"
                  class="rounded-pill bg-brand-deep px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-overline text-white"
                >
                  Start scene
                </span>
                <span
                  v-if="gapsOf(scene).length"
                  class="rounded-pill bg-warning/10 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-overline text-warning"
                >
                  {{ gapsOf(scene).length }} to fix
                </span>
                <span class="ml-auto text-[11px] text-muted-foreground">
                  {{ scene.blocks.length }} block{{ scene.blocks.length === 1 ? '' : 's' }} ·
                  {{ scene.rules.length }} rule{{ scene.rules.length === 1 ? '' : 's' }}
                </span>
              </div>

              <ul
                v-if="scene.rules.length"
                class="mt-3 space-y-1.5 border-t border-border pt-3"
              >
                <li v-for="rule in scene.rules" :key="rule.key">
                  <RuleSentence :rule="rule" :document="document" :objects="objects" />
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <aside class="space-y-4 lg:sticky lg:top-6 lg:self-start">
        <div class="rounded-lg border border-border bg-card p-5 shadow-xs">
          <div class="label-overline text-muted-foreground">Summary</div>
          <dl class="mt-3 space-y-2.5 text-[13px]">
            <div v-for="row in summary" :key="row.label">
              <dt class="label-overline text-muted-foreground">{{ row.label }}</dt>
              <dd class="font-semibold">{{ row.value }}</dd>
            </div>
          </dl>
        </div>

        <div v-if="cards.length" class="rounded-lg border border-border bg-card p-5 shadow-xs">
          <div class="label-overline text-muted-foreground">Objects it needs</div>
          <div class="mt-3 flex flex-wrap gap-1.5">
            <ScanObjectChip v-for="id in cards" :key="id" :id="id" :objects="objects" />
          </div>
        </div>

        <div
          v-if="document.variables.length"
          class="rounded-lg border border-border bg-card p-5 shadow-xs"
        >
          <div class="label-overline text-muted-foreground">Values it keeps track of</div>
          <div class="mt-3 space-y-1.5">
            <div
              v-for="variable in document.variables"
              :key="variable.key"
              class="flex items-center justify-between rounded-sm bg-surface-2 px-2.5 py-1.5 text-[12px]"
            >
              <span class="font-mono font-bold text-brand-deep">{{ variable.key }}</span>
              <span class="text-muted-foreground">starts at {{ variable.initial }}</span>
            </div>
          </div>
        </div>

        <!-- What is still open. None of it blocks Create. -->
        <div
          class="rounded-lg border p-5"
          :class="gapTotal ? 'border-warning/40 bg-warning/[.06]' : 'border-success/30 bg-success/[.06]'"
        >
          <div class="label-overline" :class="gapTotal ? 'text-warning' : 'text-success'">
            {{ gapTotal ? `${gapTotal} to finish after this` : 'Nothing left to fix' }}
          </div>
          <div v-if="gapTotal" class="mt-2.5 space-y-1.5">
            <template v-for="scene in scenes" :key="scene.key">
              <div v-for="gap in gapsOf(scene)" :key="gap" class="text-[12px] text-warning">
                {{ gap }}
                <span class="text-muted-foreground">· {{ scene.name }}</span>
              </div>
            </template>
          </div>
        </div>
      </aside>
    </div>
  </div>
</template>

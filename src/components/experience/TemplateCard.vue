<script setup lang="ts">
import { ArrowRight } from 'lucide-vue-next'
import type { ExperienceTemplate } from '@/lib/experienceTemplates'
import TemplateIcon from './TemplateIcon.vue'

defineProps<{ template: ExperienceTemplate; selected: boolean }>()
defineEmits<{ (e: 'pick'): void }>()
</script>

<template>
  <button
    type="button"
    class="group flex h-full flex-col rounded-lg border-2 bg-card p-5 text-left shadow-xs transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    :class="
      selected ? 'border-brand-deep ring-4 ring-brand-deep/10' : 'border-border hover:border-brand-purple'
    "
    :aria-pressed="selected"
    @click="$emit('pick')"
  >
    <div class="flex items-start gap-3">
      <span
        class="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-brand-deep/[.08] text-brand-deep"
      >
        <TemplateIcon :name="template.icon" class="h-5 w-5" />
      </span>
      <span class="min-w-0 flex-1">
        <span class="flex items-center gap-2">
          <span class="block text-[15px] font-extrabold leading-tight">{{ template.name }}</span>
          <span
            v-if="template.badge"
            class="rounded-pill bg-brand-purple/15 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-overline text-brand-deep"
          >
            {{ template.badge }}
          </span>
        </span>
        <span class="mt-0.5 block text-[12px] font-semibold text-brand-purple">
          {{ template.tagline }}
        </span>
      </span>
    </div>

    <p class="mt-3 text-[13px] leading-relaxed text-secondary-foreground">{{ template.blurb }}</p>

    <!-- The path it will create, shown before it is applied. -->
    <div class="mt-4 flex flex-wrap items-center gap-1.5 border-t border-border pt-3">
      <template v-for="(step, index) in template.example" :key="step">
        <ArrowRight v-if="index" class="h-3 w-3 text-muted-foreground" />
        <span class="rounded-sm bg-surface-2 px-2 py-1 text-[11px] font-bold text-secondary-foreground">
          {{ step }}
        </span>
      </template>
    </div>
  </button>
</template>

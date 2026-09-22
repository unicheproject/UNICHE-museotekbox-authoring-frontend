<script setup lang="ts">
import { computed } from 'vue'
import { CircleHelp, File, Play, Route, ScanLine } from 'lucide-vue-next'
import type { TemplateIconName } from '@/lib/experienceTemplates'

// The templates are plain data, so they name their icon instead of importing one.
const props = defineProps<{ name: TemplateIconName; class?: string }>()

const ICONS = {
  scan: ScanLine,
  quiz: CircleHelp,
  route: Route,
  play: Play,
  blank: File,
}

const component = computed(() => ICONS[props.name])
</script>

<template>
  <component :is="component" :class="props.class ?? 'h-4 w-4'" />
</template>

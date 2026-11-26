<script setup lang="ts">
import { computed } from 'vue'
import { AlertTriangle, MessageCircle, Package } from 'lucide-vue-next'
import type { PublishLabel } from '@/lib/publish'
import { pill, pillTone } from './styles'

/**
 * The status pills of an experience, the same on every screen (the experiences list, the
 * Dashboard, the editor header). Each pill shows only when its prop is given and says something:
 *
 * - `publish`: whether it has been published (backend `/published`): Draft, Published vN, or
 *   Published vN · changes. "Published" means only that — never "is on a Box".
 * - `boxes`: how many Boxes it is installed on, as "On N Boxes"; nothing when 0 or unknown.
 * - `comments`: open comment threads; nothing when 0.
 * - `missing`: things still to fix; nothing when 0.
 * - `status`: the Catalogue status, shown only when it is not the usual ACTIVE.
 */
const props = defineProps<{
  publish?: PublishLabel | null
  boxes?: number | null
  comments?: number
  missing?: number | null
  status?: string
}>()

const unusual = computed(() => {
  const s = props.status
  return s && s.toUpperCase() !== 'ACTIVE' ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : null
})
</script>

<template>
  <span class="inline-flex flex-wrap items-center gap-1.5">
    <span v-if="unusual" :class="[pill, pillTone.danger]">{{ unusual }}</span>

    <span v-if="publish?.kind === 'draft'" :class="[pill, pillTone.outline]">
      <span class="h-1.5 w-1.5 rounded-full bg-muted-foreground/60" />Draft
    </span>
    <span v-else-if="publish?.kind === 'published'" :class="[pill, pillTone.success]">
      <span class="h-1.5 w-1.5 rounded-full bg-success" />Published v{{ publish.version }}
      <span v-if="publish.changes" class="text-warning">· changes</span>
    </span>

    <span v-if="boxes" :class="[pill, pillTone.neutral]">
      <Package class="h-3 w-3" />On {{ boxes }} Box{{ boxes === 1 ? '' : 'es' }}
    </span>

    <span v-if="comments" :class="[pill, pillTone.brand]" :title="`${comments} open comment${comments === 1 ? '' : 's'}`">
      <MessageCircle class="h-3 w-3" />{{ comments }}
    </span>

    <span v-if="missing" :class="[pill, pillTone.warning]" title="Things to fix before publishing">
      <AlertTriangle class="h-3 w-3" />{{ missing }} to fix
    </span>
  </span>
</template>

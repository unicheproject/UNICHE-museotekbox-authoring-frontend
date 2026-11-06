<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { AlertTriangle, ArrowRight, Film, MessageCircle, Volume2 } from 'lucide-vue-next'
import type { ProjectDto } from '@/api/museotekBox'
import { OUTPUTS, template, type ScanType } from '@/lib/authoring/engine'
import { mediaUrlIn } from '@/lib/authoring/media'
import { summarize } from '@/lib/authoring/useAuthoring'
import { relTime } from '@/lib/authoring/useComments'
import { useShared } from '@/lib/queries'
import { useVisible } from '@/lib/useVisible'
import AIcon from '@/components/authoring/AIcon.vue'

/**
 * One experience in the list: its first picture, its name, when it was last edited, the kinds of
 * activity in it, open comments, where it plays, and whether it is published or what is left to do.
 *
 * What the whole list knows (comments, Published, scan types) comes in as props, loaded once per
 * organisation by the page. Only the experience itself (and its picture) is read here — once the
 * card is near the screen, through the shared cache, so coming back to the list or opening the
 * experience does not read it again. If that fails the card says less and still opens it.
 */
const props = defineProps<{
  project: ProjectDto
  /** Open comment threads. */
  comments: number
  /** On at least one Box; null while not known. */
  published: boolean | null
  /** The organisation's scan types, to count what is missing; null until they are known. */
  scanTypes: ScanType[] | null
}>()

const root = ref<unknown>(null)
const visible = useVisible(root)
const { data: doc } = useShared('experience', () => (visible.value ? props.project.id : null), { staleMs: 60_000 })

const summary = computed(() => (doc.value ? summarize(doc.value, props.scanTypes) : null))
const picture = computed(() => (summary.value?.pictureId ? mediaUrlIn(props.project.orgId, summary.value.pictureId) : undefined))
const output = computed(() => (summary.value ? OUTPUTS[summary.value.output] : null))
const activities = computed(() => summary.value?.templates.length ?? 0)
/** Each kind of activity once, in the order it first appears: nine activities are not nine icons. */
const kinds = computed(() => Array.from(new Set(summary.value?.templates ?? [])))
/** A catalogue status other than the usual one is shown as it is, so it is never hidden. */
const unusual = computed(() => {
  const s = props.project.status
  return s && s.toUpperCase() !== 'ACTIVE' ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : null
})
</script>

<template>
  <RouterLink
    ref="root"
    :to="`/experiences/${project.id}`"
    class="group flex flex-col overflow-hidden rounded-lg border border-border bg-white shadow-xs transition-all hover:-translate-y-0.5 hover:border-brand-deep/35 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
  >
    <!-- The picture fills the whole width of the card at 16:9, so its height follows the width. -->
    <span
      class="relative block aspect-video overflow-hidden"
      :class="picture ? 'bg-surface-2' : 'bg-gradient-to-br from-brand-deep to-[#7b3fb8]'"
    >
      <img v-if="picture" :src="picture" alt="" class="h-full w-full object-cover" />
      <!-- The kinds of activity in it, on the picture's corner. -->
      <span v-if="kinds.length" class="absolute bottom-2 left-2 flex gap-1">
        <span
          v-for="t in kinds"
          :key="t"
          class="flex h-7 w-7 items-center justify-center rounded-md bg-white/95 text-brand-deep shadow-xs"
          :title="template(t).name"
        >
          <AIcon :name="template(t).icon" cls="h-3.5 w-3.5" />
        </span>
      </span>
    </span>

    <span class="flex flex-1 flex-col p-4">
      <span class="line-clamp-2 text-[15px] font-bold leading-snug">{{ project.name || 'Untitled experience' }}</span>
      <span class="mt-1 text-[12.5px] text-muted-foreground">
        <template v-if="project.updatedAt">Edited {{ relTime(project.updatedAt) }}</template>
        <template v-if="summary">
          <template v-if="project.updatedAt"> · </template>{{ activities }} activit{{ activities === 1 ? 'y' : 'ies' }}
        </template>
      </span>
      <span
        v-if="comments"
        class="mt-1 inline-flex items-center gap-1.5 text-[12.5px] font-bold text-brand-deep underline-offset-2 group-hover:underline"
      >
        <MessageCircle class="h-3.5 w-3.5" />{{ comments }} comment{{ comments === 1 ? '' : 's' }}
      </span>
      <span v-if="output" class="mt-2 inline-flex items-center gap-1.5 text-[12.5px] font-bold text-brand-deep">
        <Film v-if="output.id === 'DISPLAY'" class="h-3.5 w-3.5" />
        <Volume2 v-else class="h-3.5 w-3.5" />
        {{ output.name }}
      </span>

      <span class="flex-1" />
      <span class="mt-4 flex items-center justify-between gap-2 border-t border-border pt-3">
        <span class="flex flex-wrap items-center gap-2">
          <span v-if="unusual" class="inline-flex items-center gap-1.5 rounded-pill bg-red-50 px-2.5 py-0.5 text-[12px] font-bold text-destructive">
            {{ unusual }}
          </span>
          <span
            v-else-if="published"
            class="inline-flex items-center gap-1.5 rounded-pill bg-emerald-50 px-2.5 py-0.5 text-[12px] font-bold text-success"
          >
            <span class="h-1.5 w-1.5 rounded-full bg-success" />Published
          </span>
          <span
            v-else-if="published === false"
            class="inline-flex items-center gap-1.5 rounded-pill border border-border bg-white px-2.5 py-0.5 text-[12px] font-bold text-secondary-foreground"
          >
            <span class="h-1.5 w-1.5 rounded-full bg-muted-foreground/60" />Draft
          </span>
          <span
            v-if="summary?.missing"
            class="inline-flex items-center gap-1 rounded-pill bg-amber-50 px-2 py-0.5 text-[12px] font-bold text-warning ring-1 ring-amber-200"
          >
            <AlertTriangle class="h-3 w-3" />{{ summary.missing }} missing
          </span>
        </span>
        <span class="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-brand-deep">
          Open<ArrowRight class="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </span>
      </span>
    </span>
  </RouterLink>
</template>

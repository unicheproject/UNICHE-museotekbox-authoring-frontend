<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { ArrowRight, Film, MessageCircle, Volume2 } from 'lucide-vue-next'
import type { ProjectDto } from '@/api/museotekBox'
import type { PublishLabel } from '@/lib/publish'
import { OUTPUTS, template, type ScanType } from '@/lib/authoring/engine'
import { mediaUrlIn } from '@/lib/authoring/media'
import { summarize } from '@/lib/authoring/useAuthoring'
import { relTime } from '@/lib/authoring/useComments'
import { useShared } from '@/lib/queries'
import { useVisible } from '@/lib/useVisible'
import { cardBox, cardOpen, coverFallback } from './styles'
import AIcon from '@/components/authoring/AIcon.vue'
import ExperienceBadges from './ExperienceBadges.vue'

/**
 * One experience in the list: its first picture, its name, when it was last edited, the kinds of
 * activity in it, open comments, where it plays, how many Boxes it is on and what is left to do.
 * Whether it has been published shows when the screen passes `publish` (the Dashboard does for its
 * few cards; the full list does not yet, as it would be one call per card).
 *
 * What the whole list knows (comments, Boxes, scan types) comes in as props, loaded once per
 * organisation by the page. Only the experience itself (and its picture) is read here — once the
 * card is near the screen, through the shared cache, so coming back to the list or opening the
 * experience does not read it again. If that fails the card says less and still opens it.
 */
const props = defineProps<{
  project: ProjectDto
  /** Open comment threads. */
  comments: number
  /** How many Boxes it is installed on; null while not known. */
  boxes: number | null
  /** Draft / Published vN, where the screen has it (one call per card, so not every screen does). */
  publish?: PublishLabel | null
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
</script>

<template>
  <RouterLink
    ref="root"
    :to="`/experiences/${project.id}`"
    :class="['group flex flex-col overflow-hidden', cardBox]"
  >
    <!-- The picture fills the whole width of the card at 16:9, so its height follows the width. -->
    <span
      class="relative block aspect-video overflow-hidden"
      :class="picture ? 'bg-surface-2' : coverFallback"
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
        <ExperienceBadges :publish="publish" :boxes="boxes" :missing="summary?.missing" :status="project.status" />
        <span :class="cardOpen">
          Open<ArrowRight class="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </span>
      </span>
    </span>
  </RouterLink>
</template>

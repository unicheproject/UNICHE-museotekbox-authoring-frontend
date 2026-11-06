<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { OUTPUTS, REPLY_KINDS, colorHex, hasDisplay, type Authoring, type ReplyKind } from '@/lib/authoring/engine'
import AIcon from './AIcon.vue'
import CustomRows from './CustomRows.vue'
import SwatchRow from './SwatchRow.vue'
import Crumbs from './ui/Crumbs.vue'
import MediaField from './ui/MediaField.vue'
import MoreSettings from './ui/MoreSettings.vue'
import QCard from './ui/QCard.vue'
import Sub from './ui/Sub.vue'
import { bigInput, btnDeep, btnOutline } from './ui/styles'

/** The whole experience on a page: its name, and the replies every activity uses. Where it plays, the scenes and deleting it are under "More settings". */
const props = defineProps<{ a: Authoring; base: string }>()
const emit = defineEmits<{ change: []; rename: [name: string]; advanced: []; delete: [] }>()

const router = useRouter()
const display = computed(() => hasDisplay(props.a))
const out = computed(() => OUTPUTS[props.a.details.output])
const TITLES: Record<ReplyKind, string> = {
  correct: 'When the answer is right',
  hint: 'When they ask for a clue',
  wrong: 'When the answer is wrong',
}

function set(kind: ReplyKind, key: 'text' | 'color' | 'media' | 'audio' | 'boxVideo', value: string) {
  props.a.details.replies[kind][key] = value
  emit('change')
}
</script>

<template>
  <div class="mx-auto max-w-[760px] min-[1700px]:max-w-[1100px]">
    <Crumbs :parts="[{ text: 'Experiences', to: '/experiences' }, { text: a.details.name || 'Untitled experience', to: base }, { text: 'Settings' }]" />
    <h1 class="mb-5 text-2xl font-extrabold tracking-tight">Settings</h1>
    <div class="space-y-5">
      <QCard :n="1" title="Name" :miss="!a.details.name.trim()">
        <input :value="a.details.name" aria-label="Name" :class="bigInput" @input="emit('rename', ($event.target as HTMLInputElement).value)" />
      </QCard>

      <QCard v-for="(k, n) in REPLY_KINDS" :key="k.key" :n="n + 2" :title="TITLES[k.key]">
        <template #title>
          <span class="inline-flex items-center gap-2.5">
            <span class="h-4 w-4 rounded-full" :style="{ background: colorHex(a.details.replies[k.key].color) }" />{{ TITLES[k.key] }}
          </span>
        </template>
        <div class="space-y-5">
          <div v-if="display">
            <Sub title="Words on the screen" />
            <input :value="a.details.replies[k.key].text" :class="bigInput" @input="set(k.key, 'text', ($event.target as HTMLInputElement).value)" />
          </div>
          <div v-if="display">
            <Sub title="Colour" />
            <SwatchRow :model-value="a.details.replies[k.key].color" @update:model-value="set(k.key, 'color', $event)" />
          </div>
          <div>
            <Sub title="Sound from the Box" :optional="display" />
            <MediaField kind="AUDIO" :model-value="a.details.replies[k.key].audio" @update:model-value="set(k.key, 'audio', $event)" />
          </div>
          <div v-if="display">
            <Sub title="Picture instead of the colour" optional />
            <MediaField kind="PICTURE" :model-value="a.details.replies[k.key].media" @update:model-value="set(k.key, 'media', $event)" />
          </div>
          <div>
            <Sub title="Video on the Box" optional />
            <MediaField kind="VIDEO" :model-value="a.details.replies[k.key].boxVideo" @update:model-value="set(k.key, 'boxVideo', $event)" />
          </div>
        </div>
      </QCard>

      <QCard :n="REPLY_KINDS.length + 2" title="Wrong answers with their own reply" optional>
        <CustomRows :a="a" :rows="a.details.customs" :one="false" @change="emit('change')" />
      </QCard>

      <MoreSettings>
        <div class="flex items-center gap-2.5 text-[14px]">
          <AIcon :name="out.icon" cls="h-4 w-4 text-brand-deep" /><span><b>Plays on:</b> {{ out.name }}</span>
        </div>
        <div class="flex flex-wrap gap-2.5">
          <button type="button" :class="[btnOutline, '!py-2.5 !text-[13px]']" @click="emit('advanced')">Scenes and rules</button>
          <button type="button" :class="[btnOutline, '!py-2.5 !text-[13px] hover:!border-destructive hover:!text-destructive']" @click="emit('delete')">
            <AIcon name="trash" />Delete this experience
          </button>
        </div>
      </MoreSettings>
    </div>
    <div class="mt-8 flex justify-end border-t border-border pb-12 pt-6">
      <button type="button" :class="btnDeep" @click="router.push(base)">Done</button>
    </div>
  </div>
</template>

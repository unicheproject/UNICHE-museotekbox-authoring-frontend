<script setup lang="ts">
import { computed } from 'vue'
import { OUTPUTS, REPLY_KINDS, colorHex, hasDisplay, type Authoring, type ReplyKind } from '@/lib/authoring/engine'
import { inputCls } from '@/lib/authoring/html'
import AField from './AField.vue'
import AIcon from './AIcon.vue'
import CustomRows from './CustomRows.vue'
import DialogShell from './DialogShell.vue'
import MediaPicker from './MediaPicker.vue'
import SwatchRow from './SwatchRow.vue'

/** The whole experience: its name, where it plays, and the replies every activity uses. */
const props = defineProps<{ a: Authoring }>()
const emit = defineEmits<{ close: []; change: []; rename: [name: string]; advanced: []; delete: [] }>()

const out = computed(() => OUTPUTS[props.a.details.output])

function set(kind: ReplyKind, key: 'text' | 'color' | 'media' | 'audio' | 'boxVideo', value: string) {
  props.a.details.replies[kind][key] = value
  emit('change')
}
</script>

<template>
  <DialogShell kicker="Whole experience" title="Settings" @close="emit('close')">
    <div class="space-y-6">
      <section>
        <div class="mb-2 text-[13px] font-extrabold">Name</div>
        <input
          :value="a.details.name"
          aria-label="Name"
          :class="[inputCls, a.details.name.trim() ? '' : 'border-warning']"
          @input="emit('rename', ($event.target as HTMLInputElement).value)"
        />
      </section>
      <section>
        <div class="mb-2 text-[13px] font-extrabold">Where it plays</div>
        <p class="flex items-center gap-2 rounded-md bg-surface-2 px-3 py-2.5 text-[12.5px] text-secondary-foreground">
          <AIcon :name="out.icon" cls="h-4 w-4 text-brand-deep" />
          <span><b>{{ out.name }}</b> — chosen when the experience was created. It can't change, because the media and replies depend on it.</span>
        </p>
      </section>
      <section>
        <div class="mb-1 text-[13px] font-extrabold">Replies of the Box{{ hasDisplay(a) ? ' and screen' : '' }}</div>
        <p class="mb-3 text-[12px] text-muted-foreground">Used in every activity. A single question can still say something different.</p>
        <div class="space-y-3">
          <div v-for="k in REPLY_KINDS" :key="k.key" class="rounded-md border border-border p-4">
            <div class="mb-1 flex items-center gap-2">
              <span class="h-3 w-3 rounded-pill" :style="{ background: colorHex(a.details.replies[k.key].color) }" />
              <span class="text-[12.5px] font-extrabold">{{ k.label }}</span>
            </div>
            <p class="mb-3 text-[11.5px] text-muted-foreground">{{ k.hint }}</p>
            <div class="grid gap-3 sm:grid-cols-2">
              <AField v-if="hasDisplay(a)" label="Words on the screen">
                <input
                  :value="a.details.replies[k.key].text"
                  :class="[inputCls, 'py-1.5 text-[13px]']"
                  @input="set(k.key, 'text', ($event.target as HTMLInputElement).value)"
                />
              </AField>
              <AField v-if="hasDisplay(a)" label="Picture instead of the colour (optional)">
                <MediaPicker
                  kind="PICTURE"
                  cls="py-1.5 text-[13px]"
                  :model-value="a.details.replies[k.key].media"
                  @update:model-value="set(k.key, 'media', $event)"
                />
              </AField>
              <AField :label="hasDisplay(a) ? 'Sound from the Box (optional)' : 'Sound from the Box'">
                <MediaPicker
                  kind="AUDIO"
                  cls="py-1.5 text-[13px]"
                  :model-value="a.details.replies[k.key].audio"
                  @update:model-value="set(k.key, 'audio', $event)"
                />
              </AField>
              <AField label="Video on the Box (optional)" help="Plays on the Box’s own display, together with the sound.">
                <MediaPicker
                  kind="VIDEO"
                  cls="py-1.5 text-[13px]"
                  :model-value="a.details.replies[k.key].boxVideo"
                  @update:model-value="set(k.key, 'boxVideo', $event)"
                />
              </AField>
              <div v-if="hasDisplay(a)">
                <span class="mb-1.5 block text-[10px] font-bold uppercase tracking-overline text-muted-foreground">Colour</span>
                <SwatchRow :model-value="a.details.replies[k.key].color" @update:model-value="set(k.key, 'color', $event)" />
              </div>
            </div>
          </div>
          <div class="rounded-md border border-border p-4">
            <CustomRows :a="a" :rows="a.details.customs" :one="false" @change="emit('change')" />
          </div>
        </div>
      </section>
      <section class="border-t border-border pt-5">
        <button
          type="button"
          class="flex w-full items-center justify-between gap-3 rounded-md border border-border px-4 py-3 text-left hover:border-brand-deep"
          @click="emit('advanced')"
        >
          <span>
            <span class="block text-[13px] font-extrabold">Scenes and rules</span>
            <span class="block text-[12px] text-muted-foreground">Every screen and rule the Box follows, for fine-tuning.</span>
          </span>
          <span class="shrink-0 rounded-sm bg-surface-2 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-overline text-muted-foreground">advanced</span>
        </button>
      </section>
      <section class="border-t border-border pt-5">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <span>
            <span class="block text-[13px] font-extrabold">Delete this experience</span>
            <span class="block text-[12px] text-muted-foreground">Removes it from the museum's list.</span>
          </span>
          <button
            type="button"
            class="flex items-center gap-2 rounded-md border border-input bg-white px-4 py-2 text-[12px] font-extrabold uppercase tracking-button text-destructive hover:border-destructive"
            @click="emit('delete')"
          >
            <AIcon name="trash" cls="h-4 w-4" /> Delete
          </button>
        </div>
      </section>
    </div>
  </DialogShell>
</template>

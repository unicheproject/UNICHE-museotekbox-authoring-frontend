<script setup lang="ts">
import { computed } from 'vue'
import { REPLY_KINDS, colorHex, hasDisplay, questionsOnly, type Authoring, type Cfg } from '@/lib/authoring/engine'
import { inputCls } from '@/lib/authoring/html'
import AField from './AField.vue'
import MediaPicker from './MediaPicker.vue'
import QuizQuestions from './QuizQuestions.vue'
import SectionHead from './SectionHead.vue'

/**
 * What a Quiz asks for, all in one scroll: its questions, the rules of the game, the result screen,
 * and the replies it uses.
 */
const props = defineProps<{ a: Authoring; cfg: Cfg }>()
const emit = defineEmits<{ change: []; replies: [] }>()

const total = computed(() => questionsOnly(props.cfg.questions).length)
const own = computed(() => (props.a.details.customs || []).filter((c) => c.scan).length)

function set(key: string, value: unknown) {
  props.cfg[key] = value
  emit('change')
}
const val = (e: Event) => (e.target as HTMLInputElement).value
</script>

<template>
  <div>
    <QuizQuestions :a="a" :cfg="cfg" @change="emit('change')" />
  </div>

  <div class="mt-6 border-t border-border pt-6">
    <SectionHead title="Rules of the game" help="When the quiz stops, and what counts as winning." />
    <div class="grid gap-4 sm:grid-cols-2">
      <AField label="Stop if nothing is scanned for" help="Leave empty and the quiz waits for as long as it takes.">
        <div class="flex items-center gap-2">
          <input
            type="number"
            min="0"
            :value="cfg.idleSeconds ?? ''"
            placeholder="—"
            :class="[inputCls, 'max-w-[7rem]']"
            @input="set('idleSeconds', val($event))"
          />
          <span class="text-[13px] text-muted-foreground">seconds</span>
        </div>
      </AField>
      <AField label="They win when">
        <div class="flex flex-wrap items-center gap-2">
          <select :value="cfg.winMode" :class="[inputCls, 'max-w-[13rem]']" @change="set('winMode', val($event))">
            <option value="count">this many are right</option>
            <option value="all">every one is right</option>
          </select>
          <template v-if="cfg.winMode === 'count'">
            <input
              type="number"
              min="0"
              :max="total"
              :value="cfg.winCount ?? ''"
              placeholder="—"
              :class="[inputCls, 'max-w-[6rem]']"
              @input="set('winCount', val($event))"
            />
            <span class="text-[13px] text-muted-foreground">out of {{ total }}</span>
          </template>
        </div>
      </AField>
    </div>
  </div>

  <div class="mt-6 border-t border-border pt-6">
    <SectionHead title="The result screen" help="The last screen of the quiz. How long it stays is set on the line after it." />
    <div class="grid gap-4 sm:grid-cols-2">
      <AField v-if="hasDisplay(a)" label="Background">
        <MediaPicker kind="VISUAL" cls="py-1.5 text-[13px]" :model-value="cfg.resultMedia ?? ''" @update:model-value="set('resultMedia', $event)" />
      </AField>
      <AField label="Sound">
        <MediaPicker kind="AUDIO" cls="py-1.5 text-[13px]" :model-value="cfg.resultAudio ?? ''" @update:model-value="set('resultAudio', $event)" />
      </AField>
      <AField label="If they won">
        <input :value="cfg.resultWin ?? ''" :class="[inputCls, 'py-1.5 text-[13px]']" @input="set('resultWin', val($event))" />
      </AField>
      <AField label="If they did not">
        <input :value="cfg.resultLose ?? ''" :class="[inputCls, 'py-1.5 text-[13px]']" @input="set('resultLose', val($event))" />
      </AField>
    </div>
  </div>

  <!-- The replies are the experience's: say so, and point there. -->
  <div class="mt-6 border-t border-border pt-6">
    <div class="rounded-lg border border-border bg-surface-2/60 px-5 py-4">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div class="text-[14px] font-extrabold">Replies of the Box and screen</div>
          <p class="mt-0.5 text-[12.5px] text-muted-foreground">
            The same for the whole experience<template v-if="own"
              >, with {{ own }} object{{ own === 1 ? '' : 's' }} that {{ own === 1 ? 'has' : 'have' }} a reply of
              {{ own === 1 ? 'its' : 'their' }} own</template
            >. To change one question only, open it and use “Say something different”.
          </p>
        </div>
        <button type="button" class="text-[12px] font-bold text-brand-deep hover:underline" @click="emit('replies')">
          Change for the whole experience →
        </button>
      </div>
      <div class="mt-3 flex flex-wrap gap-1.5">
        <span
          v-for="k in REPLY_KINDS"
          :key="k.key"
          class="inline-flex items-center gap-1.5 rounded-pill border border-border bg-white px-2.5 py-1 text-[11.5px] font-bold"
        >
          <span class="h-2 w-2 rounded-pill" :style="{ background: colorHex(a.details.replies[k.key].color) }" />{{
            a.details.replies[k.key].text
          }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { describeError } from '@/api/museotekBox'
import { MEDIA } from '@/lib/authoring/engine'
import { acceptFor, addToLibrary, kindsFor, thumbOf, type PickKind } from '@/lib/authoring/media'
import AIcon from '../AIcon.vue'
import { bigInput, btnDeep, btnOutline, dialogBody, dialogBox, dialogClose, dialogHead, dialogTitle, overlay } from './styles'

/**
 * The museum's library of one kind, as big tiles: pick one, upload a new file (it is added and
 * chosen), or name a file that is not uploaded yet.
 */
const props = defineProps<{ kind: PickKind; modelValue: string }>()
const emit = defineEmits<{ pick: [value: string]; close: [] }>()

const list = computed(() => MEDIA.filter((m) => kindsFor(props.kind).includes(m.kind)))
const word = computed(
  () => ({ IMAGE: 'pictures', PICTURE: 'pictures', VIDEO: 'videos', AUDIO: 'sounds', VISUAL: 'pictures and videos', ILLUSTRATION: 'drawings' })[props.kind],
)
const own = computed(() => (props.modelValue && !list.value.some((m) => m.id === props.modelValue) ? props.modelValue : null))
const iconOf = (k: string) => (k === 'AUDIO' ? 'audio' : k === 'VIDEO' ? 'film' : k === 'ILLUSTRATION' ? 'brush' : 'image')

const naming = ref(false)
const typed = ref('')
const box = ref<HTMLInputElement | null>(null)
async function startNaming() {
  naming.value = true
  await nextTick()
  box.value?.focus()
}
function addNamed() {
  if (typed.value.trim()) emit('pick', typed.value.trim())
}

const file = ref<HTMLInputElement | null>(null)
const progress = ref<number | null>(null)
const error = ref<string | null>(null)
async function onFile(event: Event) {
  const input = event.target as HTMLInputElement
  const picked = input.files?.[0]
  input.value = ''
  if (!picked) return
  error.value = null
  progress.value = 0
  try {
    const item = await addToLibrary(picked, (p) => (progress.value = p))
    emit('pick', item.id)
  } catch (e) {
    error.value = describeError(e)
  } finally {
    progress.value = null
  }
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    e.stopPropagation()
    emit('close')
  }
}
onMounted(() => window.addEventListener('keydown', onKey, true))
onUnmounted(() => window.removeEventListener('keydown', onKey, true))
</script>

<template>
  <Teleport to="body">
    <div :class="overlay" @click.self="emit('close')">
      <div role="dialog" aria-modal="true" :aria-label="`Your ${word}`" :class="[dialogBox, 'max-w-3xl']">
        <div :class="[dialogHead, 'items-center']">
          <h2 :class="[dialogTitle, 'min-w-0 flex-1']">Your {{ word }}</h2>
          <button type="button" aria-label="Upload" :class="[btnOutline, '!py-2']" :disabled="progress != null" @click="file?.click()">
            <AIcon name="upload" /><span class="hidden sm:inline">{{ progress != null ? `Uploading… ${progress}%` : 'Upload' }}</span>
          </button>
          <button type="button" title="Close" aria-label="Close" :class="dialogClose" @click="emit('close')">
            <AIcon name="x" cls="h-5 w-5" />
          </button>
        </div>
        <div :class="dialogBody">
          <p v-if="error" role="alert" class="mb-5 rounded-md bg-destructive/[.06] px-4 py-3 text-[13px] font-bold text-destructive">{{ error }}</p>
          <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
            <button
              v-for="m in list"
              :key="m.id"
              type="button"
              class="overflow-hidden rounded-xl border-2 text-left transition-all hover:-translate-y-0.5 hover:shadow-md"
              :class="modelValue === m.id ? 'border-brand-deep' : 'border-border hover:border-brand-deep/60'"
              @click="emit('pick', m.id)"
            >
              <span class="relative flex aspect-video w-full items-center justify-center bg-surface-2 text-brand-deep">
                <template v-if="m.kind !== 'AUDIO' && thumbOf(m.id)">
                  <video v-if="m.kind === 'VIDEO'" :src="`${thumbOf(m.id)}#t=0.1`" muted playsinline preload="metadata" class="h-full w-full object-cover" />
                  <img v-else :src="thumbOf(m.id)" alt="" class="h-full w-full object-cover" />
                </template>
                <AIcon v-else :name="iconOf(m.kind)" cls="h-8 w-8" />
              </span>
              <span class="flex items-center gap-2 px-3 py-2 text-[13px] font-semibold">
                <AIcon :name="iconOf(m.kind)" cls="h-3.5 w-3.5 shrink-0 text-muted-foreground" /><span class="truncate">{{ m.name }}</span>
              </span>
            </button>
            <button
              v-if="own"
              type="button"
              class="flex min-h-[120px] flex-col items-center justify-center gap-2 rounded-xl border-2 border-brand-deep px-3 text-center text-[13px] font-semibold"
              @click="emit('pick', own)"
            >
              <span class="truncate">{{ own }}</span>
              <span class="rounded-pill bg-warning/10 px-2.5 py-0.5 text-[12px] font-bold text-warning">Not uploaded yet</span>
            </button>
            <div v-if="naming" class="col-span-2 rounded-xl border-2 border-brand-deep bg-brand-deep/[.03] p-4 sm:col-span-3">
              <div class="flex flex-wrap items-center gap-3">
                <input
                  ref="box"
                  v-model="typed"
                  placeholder="Name the file you will upload"
                  autocomplete="off"
                  :class="[bigInput, '!w-auto min-w-0 flex-1 !py-2.5']"
                  @keydown.enter="addNamed"
                />
                <button type="button" :disabled="!typed.trim()" :class="[btnDeep, '!py-3']" @click="addNamed">Add</button>
                <button type="button" :class="[btnOutline, '!py-3']" @click="naming = false">Cancel</button>
              </div>
            </div>
            <button
              v-else
              type="button"
              class="flex min-h-[120px] flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-brand-deep/30 text-[15px] font-extrabold text-brand-deep hover:border-brand-deep hover:bg-brand-deep/[.03]"
              @click="startNaming"
            >
              <AIcon name="plus" cls="h-5 w-5" />Something else…
            </button>
          </div>
        </div>
        <input ref="file" type="file" :accept="acceptFor(kind)" class="hidden" @change="onFile" />
      </div>
    </div>
  </Teleport>
</template>

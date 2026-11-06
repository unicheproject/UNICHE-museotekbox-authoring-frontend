<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import type { Authoring, FixRow } from '@/lib/authoring/engine'
import { stepKeys, stepTitle } from '@/lib/authoring/tone'

/** Every step of the visit in a row: where you are, what is finished, what still needs something. The line fills up to the step you are on. */
const props = defineProps<{ a: Authoring; current: string; base: string; fixes: FixRow[] }>()
const router = useRouter()

const keys = computed(() => stepKeys(props.a))
const at = computed(() => keys.value.indexOf(props.current))
const missing = (k: string) => props.fixes.some((r) => r.key === k)
</script>

<template>
  <nav aria-label="Steps of the visit" class="-mx-1 -mt-1.5 mb-5 overflow-x-auto px-1 pb-1.5 pt-1.5">
    <ol class="flex min-w-max items-start sm:min-w-0">
      <template v-for="(k, i) in keys" :key="k">
        <li v-if="i" aria-hidden="true" class="mt-4 h-[3px] min-w-[16px] flex-1 rounded" :class="i <= at ? 'bg-brand-deep' : 'bg-brand-deep/15'" />
        <li>
          <button
            type="button"
            :aria-current="k === current ? 'step' : undefined"
            :title="missing(k) ? 'Not finished' : ''"
            class="group flex w-24 flex-col items-center gap-1.5 text-center"
            @click="router.push(`${base}/step/${k}`)"
          >
            <span
              class="relative flex h-8 w-8 items-center justify-center rounded-full text-[13px] font-extrabold transition-shadow"
              :class="
                k === current
                  ? 'bg-brand-deep text-white ring-4 ring-brand-deep/15'
                  : missing(k)
                    ? 'bg-amber-50 text-warning ring-2 ring-amber-300 group-hover:ring-brand-deep'
                    : 'bg-white text-secondary-foreground ring-2 ring-border group-hover:ring-brand-deep'
              "
            >
              {{ i + 1 }}
              <span
                v-if="missing(k)"
                class="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-amber-400 text-[9px] font-extrabold text-white ring-2 ring-surface-2"
                >!</span
              >
            </span>
            <span
              class="text-[12.5px] font-bold leading-tight"
              :class="k === current ? 'whitespace-nowrap rounded-pill bg-brand-deep px-2.5 py-0.5 text-white' : 'text-secondary-foreground group-hover:text-brand-deep'"
            >
              {{ stepTitle(a, k) }}
            </span>
          </button>
        </li>
      </template>
    </ol>
  </nav>
</template>

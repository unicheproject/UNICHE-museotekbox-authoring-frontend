<script setup lang="ts">
import { computed } from 'vue'
import { cn } from '@/lib/utils'

/**
 * The styleguide's `.avatar`: a filled circle with the person's initials.
 *
 * Deliberately only two fills, both from the brand palette. An earlier version hashed the user id
 * into eight arbitrary Tailwind colours, which put blues, ambers and teals on a screen whose
 * palette is otherwise neutral grey plus one violet.
 */
const props = defineProps<{
  initials: string
  size?: 'sm' | 'md' | 'lg'
  variant?: 'deep' | 'purple'
  class?: string
}>()

const sizes = {
  sm: 'h-[30px] w-[30px] text-[10px]',
  md: 'h-10 w-10 text-xs',
  lg: 'h-14 w-14 text-lg',
} as const

const variants = {
  deep: 'bg-brand-deep',
  purple: 'bg-brand-purple',
} as const

const classes = computed(() =>
  cn(
    'inline-flex shrink-0 items-center justify-center rounded-full font-extrabold uppercase text-white',
    sizes[props.size ?? 'md'],
    variants[props.variant ?? 'deep'],
    props.class,
  ),
)
</script>

<template>
  <span :class="classes" aria-hidden="true">{{ props.initials }}</span>
</template>

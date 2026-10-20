<script setup lang="ts">
/** A labelled control: small overline label, the control, an optional help line. */
defineProps<{ label: string; help?: string }>()
</script>

<template>
  <label class="block">
    <span class="mb-1.5 block text-[10px] font-bold uppercase tracking-overline text-muted-foreground">{{ label }}</span>
    <slot />
    <span v-if="help" class="mt-1 block text-[11.5px] text-muted-foreground">{{ help }}</span>
  </label>
</template>

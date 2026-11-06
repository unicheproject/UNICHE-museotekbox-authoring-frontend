<script setup lang="ts">
/** A small heading inside a card. */
defineProps<{ title: string; optional?: boolean }>()
</script>

<template>
  <div class="mb-2.5 text-[14px] font-bold">
    {{ title }}<span v-if="optional" class="font-semibold text-muted-foreground"> (optional)</span>
  </div>
</template>

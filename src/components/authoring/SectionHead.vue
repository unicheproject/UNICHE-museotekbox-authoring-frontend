<script setup lang="ts">
defineProps<{ title: string; help?: string }>()
</script>

<template>
  <div class="mb-4">
    <div class="text-[14px] font-extrabold">{{ title }}</div>
    <p v-if="help" class="mt-0.5 text-[12.5px] text-muted-foreground">{{ help }}</p>
  </div>
</template>

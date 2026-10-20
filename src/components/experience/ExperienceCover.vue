<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { Image } from 'lucide-vue-next'
import { getExperience, getMediaContent } from '@/api/museotekBox'

/**
 * An experience card's picture: what the visitor sees first (the start scene's picture), or else
 * the first picture the experience shows anywhere. Without one, the card keeps its icon.
 */
const props = defineProps<{ projectId: string; orgId: string }>()

const src = ref<string | null>(null)

onMounted(async () => {
  try {
    const doc = await getExperience(props.projectId)
    const pictureOf = (scenes: typeof doc.scenes) =>
      scenes
        .flatMap((s) => s.blocks)
        .map((b) => (b.type === 'IMAGE' && b.content && typeof b.content === 'object' && !Array.isArray(b.content) ? b.content.mediaId : null))
        .find((id): id is string => typeof id === 'string')
    const id = pictureOf(doc.scenes.filter((s) => s.isStart)) ?? pictureOf(doc.scenes)
    if (!id) return
    src.value = URL.createObjectURL(await getMediaContent(props.orgId, id))
  } catch {
    // No picture is fine: the card shows its icon.
  }
})
onUnmounted(() => src.value && URL.revokeObjectURL(src.value))
</script>

<template>
  <span class="flex aspect-video items-center justify-center overflow-hidden bg-surface-dark text-white/25">
    <img v-if="src" :src="src" alt="" class="h-full w-full object-cover" />
    <Image v-else class="h-8 w-8" />
  </span>
</template>

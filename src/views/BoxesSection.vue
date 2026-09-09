<script setup lang="ts">
import ComingSoon from './ComingSoon.vue'
</script>

<template>
  <ComingSoon
    title="Boxes"
    description="The physical museotekBox devices in an organisation, and the experiences deployed to each of them."
    :waiting-on="[
      'An endpoint to list boxes for an organisation',
      'An endpoint returning which experiences are assigned to a box, and the reverse lookup for a single experience',
    ]"
  />
</template>

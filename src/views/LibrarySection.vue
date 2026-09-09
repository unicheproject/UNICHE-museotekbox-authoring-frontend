<script setup lang="ts">
import ComingSoon from './ComingSoon.vue'
</script>

<template>
  <ComingSoon
    title="Library"
    description="Shared media and content assets that experiences draw from."
    :waiting-on="[
      'An endpoint to list library items for an organisation',
      'Upload and delete endpoints for media assets',
    ]"
  />
</template>

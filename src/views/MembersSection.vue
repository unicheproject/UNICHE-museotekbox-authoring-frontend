<script setup lang="ts">
import ComingSoon from './ComingSoon.vue'
</script>

<template>
  <ComingSoon
    title="Members"
    description="The people who can access an organisation's experiences, and the role each of them holds."
    :waiting-on="[
      'An endpoint to list the members of an organisation with their roles',
      'Endpoints to change a role and to remove a member',
    ]"
  />
</template>

<script setup lang="ts">
import { RouterView, useRoute } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/stores/auth'
import AppHeader from '@/components/shell/AppHeader.vue'
import AppNav from '@/components/shell/AppNav.vue'

const route = useRoute()
const { authenticated } = storeToRefs(useAuthStore())
</script>

<template>
  <!-- Unauthenticated: the landing page draws its own full-bleed hero and footer, so the shell
       hands it the whole viewport rather than centring it in a padded box. -->
  <RouterView v-if="!authenticated" />

  <!-- A bare page (a Box's display on a TV) draws the whole screen itself: no header, no menu. -->
  <RouterView v-else-if="route.meta.bare" />

  <!-- iGuide's layout: a thin bar across the top, the menu column on the left, the page beside it. -->
  <div v-else class="flex min-h-screen flex-col bg-surface-2">
    <AppHeader />

    <div class="flex min-w-0 flex-1 flex-col items-stretch md:flex-row">
      <AppNav />

      <!-- min-w-0 so a wide child (the data table) can shrink instead of stretching this column.
           Grey canvas, white cards. -->
      <main class="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <!-- One width cap for every screen, so the app does not read as two different layouts on a
             wide monitor. A grid of cards (route meta `wide`) is the exception: past laptop size it
             fills the width with more columns rather than leave empty bands on both sides. -->
        <div class="mx-auto w-full max-w-[1180px]" :class="{ 'min-[1700px]:max-w-none': route.meta.wide }">
          <RouterView />
        </div>
      </main>
    </div>
  </div>
</template>

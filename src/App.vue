<script setup lang="ts">
import { RouterView } from 'vue-router'
</script>

<template>
  <div class="app-root">
    <RouterView />
  </div>
</template>

<style scoped>
.app-root {
  min-height: 100dvh;
  background: var(--bg);
}
</style>

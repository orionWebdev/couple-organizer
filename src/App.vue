<script setup lang="ts">
import { RouterView } from 'vue-router'
import { useAuth } from '@/composables/useAuth'

const { loading } = useAuth()
</script>

<template>
  <div class="app-root">
    <div v-if="loading" class="loading-screen">
      <div class="loading-spinner" />
    </div>
    <RouterView v-else />
  </div>
</template>

<style scoped>
.app-root {
  min-height: 100dvh;
  background: var(--bg);
}

.loading-screen {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100dvh;
}

.loading-spinner {
  width: 28px;
  height: 28px;
  border: 2px solid var(--border);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>

<script setup lang="ts">
import { useToastState } from '@/composables/useToast'

const { message, visible } = useToastState()
</script>

<template>
  <Teleport to="body">
    <Transition name="toast">
      <div v-if="visible" class="toast">{{ message }}</div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.toast {
  position: fixed;
  bottom: calc(80px + var(--safe-bottom));
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
  background: var(--surface);
  border: 1px solid var(--border);
  color: var(--text);
  font-family: 'Mali', system-ui, sans-serif;
  font-size: 14px;
  font-weight: 500;
  padding: 10px 20px;
  border-radius: 100px;
  white-space: nowrap;
  pointer-events: none;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
}

.toast-enter-active,
.toast-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(8px);
}
</style>

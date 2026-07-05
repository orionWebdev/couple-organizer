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
  bottom: calc(104px + var(--safe-bottom));
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
  background: var(--surface);
  border: 1px solid var(--border-softer);
  color: var(--text);
  font-family: var(--font-body);
  font-size: 14px;
  font-weight: 700;
  padding: 10px 20px;
  border-radius: 100px;
  white-space: nowrap;
  pointer-events: none;
  box-shadow: var(--shadow-float);
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

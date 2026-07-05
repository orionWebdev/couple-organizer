<script setup lang="ts">
defineProps<{ label: string }>()
defineEmits<{ click: [] }>()
</script>

<template>
  <button type="button" class="fab" @click="$emit('click')">
    <span class="fab-plus">+</span>{{ label }}
  </button>
</template>

<style scoped>
.fab {
  position: fixed;
  left: 50%;
  bottom: calc(104px + var(--safe-bottom));
  width: min(calc(100% - 36px), 480px);
  transform: translateX(-50%);
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: var(--accent);
  color: var(--on-accent);
  border: none;
  border-radius: 16px;
  font-family: var(--font-body);
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: var(--shadow-accent);
  transition: background 0.18s ease, transform 0.12s ease;
  z-index: 50;
}

.fab-plus {
  font-size: 18px;
  font-weight: 300;
}

.fab:active {
  background: var(--accent-hover);
  transform: translateX(-50%) scale(0.96);
}
</style>

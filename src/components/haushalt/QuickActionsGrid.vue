<script setup lang="ts">
import { showToast } from '@/composables/useToast'

const DEFAULT_ACTIONS = ['Staubsaugen', 'Abwaschen', 'Müll rausbringen', 'Einkaufen gehen']

const emit = defineEmits<{
  action: [title: string]
}>()

function tap(title: string) {
  emit('action', title)
  showToast(`"${title}" eingetragen`)
}
</script>

<template>
  <div class="grid">
    <button
      v-for="action in DEFAULT_ACTIONS"
      :key="action"
      class="tile"
      @click="tap(action)"
    >
      <span class="tile-label">{{ action }}</span>
      <span class="tile-icon">+</span>
    </button>
  </div>
</template>

<style scoped>
.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  padding: 0 var(--screen-pad);
  margin-bottom: 24px;
}

.tile {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 14px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-card);
  cursor: pointer;
  transition: background 0.15s ease;
  text-align: left;
}

.tile:active {
  background: var(--surface-deep);
}

.tile-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--text);
  line-height: 1.3;
}

.tile-icon {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: var(--accent-tint);
  color: var(--accent);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
}
</style>

<script setup lang="ts">
import type { ShoppingItem } from '@/types'

const props = defineProps<{ item: ShoppingItem }>()

const emit = defineEmits<{
  toggle: [id: string, checked: boolean]
  delete: [id: string]
}>()

let pressTimer: ReturnType<typeof setTimeout> | null = null

function onTouchStart() {
  pressTimer = setTimeout(() => emit('delete', props.item.id), 500)
}
function onTouchEnd() {
  if (pressTimer) clearTimeout(pressTimer)
}
</script>

<template>
  <div
    class="item-row list-row"
    :class="{ 'item-row--checked': item.checked }"
    @touchstart.passive="onTouchStart"
    @touchend.passive="onTouchEnd"
  >
    <button
      class="cb"
      :class="{ 'cb--checked': item.checked }"
      @click="emit('toggle', item.id, !item.checked)"
    >
      <svg v-if="item.checked" width="12" height="12" viewBox="0 0 12 12" fill="none">
        <path d="M1.5 6l3 3 6-6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </button>

    <div class="item-text">
      <span class="item-name">{{ item.name }}</span>
      <span v-if="item.amount" class="item-amount mono">
        {{ item.amount }}{{ item.unit ? ' ' + item.unit : '' }}
      </span>
    </div>

    <button class="del-btn" @click="emit('delete', item.id)">×</button>

    <div class="row-divider" />
  </div>
</template>

<style scoped>
/* Nido: weiße Karte mit farbiger Checkbox */
.item-row {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 11px 13px;
  margin: 0 var(--screen-pad) 9px;
  min-height: 50px;
  background: var(--surface);
  border: 1px solid var(--border-softer);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-card);
  transition: opacity 0.2s ease,
              background-color var(--dur-highlight) var(--ease-standard);
}

.item-row--checked .item-name {
  color: var(--text-faint);
}

.cb {
  width: 26px;
  height: 26px;
  border-radius: 9px;
  border: 2px solid var(--border);
  background: var(--surface);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  cursor: pointer;
  color: #fff;
  transition: all 0.15s ease;
}

.cb--checked {
  background: var(--accent);
  border-color: var(--accent);
}

.item-text {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.item-name {
  font-size: 14px;
  font-weight: 700;
  color: var(--text);
  text-decoration: v-bind("item.checked ? 'line-through' : 'none'");
}

.item-amount {
  font-size: 12px;
  color: var(--text-meta);
  white-space: nowrap;
}

.del-btn {
  background: none;
  border: none;
  color: var(--text-faint);
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
  padding: 4px 8px;
  flex-shrink: 0;
  opacity: 0.6;
}

.row-divider {
  display: none;
}
</style>

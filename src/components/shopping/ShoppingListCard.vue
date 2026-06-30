<script setup lang="ts">
import { computed } from 'vue'
import type { ShoppingList, ShoppingItem } from '@/types'

const props = defineProps<{
  list: ShoppingList
  items: ShoppingItem[]
}>()

const emit = defineEmits<{ select: [] }>()

const uncheckedCount = computed(() => props.items.filter(i => !i.checked).length)
</script>

<template>
  <button class="list-card" @click="emit('select')">
    <div class="card-body">
      <span class="card-title">{{ list.title }}</span>
      <span class="card-badge mono" :class="{ 'badge--zero': uncheckedCount === 0 }">
        {{ uncheckedCount }}
      </span>
    </div>
    <div class="card-chevron">›</div>
  </button>
</template>

<style scoped>
.list-card {
  display: flex;
  align-items: center;
  width: 100%;
  padding: 18px 20px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-card);
  cursor: pointer;
  text-align: left;
  transition: background 0.15s ease;
}

.list-card:active {
  background: var(--surface-deep);
}

.card-body {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 26px;
  height: 26px;
  padding: 0 7px;
  background: var(--accent-tint);
  color: var(--accent);
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  flex-shrink: 0;
}

.badge--zero {
  background: var(--surface-deep);
  color: var(--text-faint);
}

.card-chevron {
  font-size: 20px;
  color: var(--text-faint);
  margin-left: 12px;
  flex-shrink: 0;
}
</style>

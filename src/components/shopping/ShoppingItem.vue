<script setup lang="ts">
import type { ShoppingItem } from '@/types'

defineProps<{
  item: ShoppingItem
}>()

const emit = defineEmits<{
  toggle: [id: string, checked: boolean]
  delete: [id: string]
}>()
</script>

<template>
  <div
    class="item-row"
    :class="{ 'item-row--checked': item.checked }"
  >
    <!-- Checkbox -->
    <button
      class="item-check"
      :class="{ 'item-check--checked': item.checked }"
      :aria-label="item.checked ? 'Als nicht erledigt markieren' : 'Als erledigt markieren'"
      @click="emit('toggle', item.id, !item.checked)"
    >
      <svg v-if="item.checked" viewBox="0 0 24 24" fill="none">
        <path d="M5 13l4 4L19 7" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </button>

    <!-- Text -->
    <div class="item-body">
      <div class="item-name-row">
        <span class="item-name">{{ item.name }}</span>
        <span v-if="item.amount" class="item-amount">
          {{ Number.isInteger(item.amount) ? item.amount : Number(item.amount.toFixed(2)) }}{{ item.unit ? '\u00a0' + item.unit : '' }}
        </span>
      </div>
      <div class="item-meta">
        <span class="item-category">{{ item.category }}</span>
        <span v-if="item.source === 'mealPlan'" class="badge badge--meal">Wochenplan</span>
        <span v-if="item.expenseId" class="badge badge--expense">Ausgabe ✓</span>
      </div>
    </div>

    <!-- Delete -->
    <button class="item-delete" aria-label="Artikel löschen" @click="emit('delete', item.id)">
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M6 18L18 6M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
      </svg>
    </button>
  </div>
</template>

<style scoped>
.item-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 0.875rem;
  background: rgba(30, 41, 59, 0.92);
  border: 1px solid rgba(71, 85, 105, 0.72);
  border-radius: 1rem;
  transition: opacity 0.16s;
}

.item-row--checked {
  opacity: 0.52;
}

/* ── Checkbox ────────────────────────────────────────────────── */
.item-check {
  width: 2rem;
  height: 2rem;
  border-radius: 9999px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border: 2px solid rgba(71, 85, 105, 0.88);
  background: transparent;
  color: #fff;
  transition: background 0.16s, border-color 0.16s;
  -webkit-tap-highlight-color: transparent;
}

.item-check--checked {
  background: var(--app-primary);
  border-color: var(--app-primary);
}

.item-check svg {
  width: 1rem;
  height: 1rem;
}

/* ── Body ────────────────────────────────────────────────────── */
.item-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.item-name-row {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  min-width: 0;
}

.item-name {
  font-size: 1.1875rem;
  font-weight: 500;
  color: var(--app-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  min-width: 0;
}

.item-amount {
  font-size: 1rem;
  font-weight: 600;
  color: var(--app-primary);
  white-space: nowrap;
  flex-shrink: 0;
}

.item-row--checked .item-name {
  text-decoration: line-through;
  color: var(--app-text-muted);
}

.item-row--checked .item-amount {
  color: var(--app-text-muted);
}

.item-meta {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  flex-wrap: wrap;
}

.item-category {
  font-size: 0.97rem;
  color: var(--app-text-muted);
}

/* ── Badges ──────────────────────────────────────────────────── */
.badge {
  font-size: 0.93rem;
  font-weight: 600;
  border-radius: 9999px;
  padding: 0.1rem 0.45rem;
}

.badge--meal {
  color: #93c5fd;
  background: rgba(59, 130, 246, 0.12);
}

.badge--expense {
  color: #6ee7b7;
  background: rgba(110, 231, 183, 0.1);
}

/* ── Delete ──────────────────────────────────────────────────── */
.item-delete {
  width: 2rem;
  height: 2rem;
  border-radius: 9999px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: 0;
  color: #475569;
  cursor: pointer;
  transition: color 0.14s, background 0.14s;
  -webkit-tap-highlight-color: transparent;
}

.item-delete:active {
  color: var(--app-danger);
  background: rgba(239, 68, 68, 0.1);
}

.item-delete svg {
  width: 1rem;
  height: 1rem;
}
</style>

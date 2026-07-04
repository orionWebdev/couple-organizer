<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Expense, Couple } from '@/types'

const props = defineProps<{
  expense: Expense
  couple: Couple | null
  currentUserId: string
}>()

const emit = defineEmits<{ delete: [id: string]; edit: [expense: Expense] }>()

const expanded = ref(false)

// Kategoriefarben aus der Nido-Referenz (Icon-Kacheln der Ausgaben-Liste)
const tagColors: Record<string, string> = {
  food:      'var(--einkauf)',
  transport: 'oklch(0.66 0.12 255)',
  home:      'var(--haushalt)',
  leisure:   'oklch(0.64 0.14 312)',
  other:     'var(--finanzen)',
}

const tagLabels: Record<string, string> = {
  food: 'Lebensmittel', transport: 'Auto', home: 'Haushalt', leisure: 'Essen', other: 'Sonstiges'
}

const tagIcons: Record<string, string> = {
  food: '🛒', transport: '🚗', home: '🏠', leisure: '🍽️', other: '📦'
}

const tagColor = computed(() => tagColors[props.expense.category] ?? 'var(--text-faint)')
const categoryLabel = computed(() => tagLabels[props.expense.category] ?? props.expense.category)
const categoryIcon = computed(() => tagIcons[props.expense.category] ?? '📦')

const amountFormatted = computed(() => {
  const euros = props.expense.amount / 100
  return euros.toFixed(2).replace('.', ',') + ' €'
})

const payerName = computed(() => props.couple?.memberNames[props.expense.paidBy] ?? 'Partner')

let pressTimer: ReturnType<typeof setTimeout> | null = null

function onTouchStart() {
  pressTimer = setTimeout(() => { expanded.value = !expanded.value }, 400)
}
function onTouchEnd() {
  if (pressTimer) clearTimeout(pressTimer)
}
function toggleExpand() {
  expanded.value = !expanded.value
}
</script>

<template>
  <div
    class="row list-row"
    :class="{ 'row--expanded': expanded }"
    @click="toggleExpand"
    @touchstart.passive="onTouchStart"
    @touchend.passive="onTouchEnd"
  >
    <div class="row-main">
      <span class="category-chip" :style="{ background: tagColor }" :title="categoryLabel">{{ categoryIcon }}</span>
      <div class="row-text">
        <span class="row-title">{{ expense.title }}</span>
        <span class="row-sub">{{ payerName }}</span>
      </div>
      <div class="row-right">
        <span class="row-amount mono">{{ amountFormatted }}</span>
      </div>
    </div>

    <div class="expand-track">
      <div class="expand-inner">
        <div class="row-actions">
          <button class="edit-btn" @click.stop="emit('edit', expense)">
            Bearbeiten
          </button>
          <button class="delete-btn" @click.stop="emit('delete', expense.id)">
            Löschen
          </button>
        </div>
      </div>
    </div>

    <div class="row-divider" />
  </div>
</template>

<style scoped>
/* Nido: weiße Karte statt Trennlinien-Zeile */
.row {
  cursor: pointer;
  padding: 0 13px;
  background: var(--surface);
  border: 1px solid var(--border-softer);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-card);
  transition: box-shadow 0.2s var(--ease-standard), border-color 0.2s var(--ease-standard);
}

.row--expanded {
  border-color: var(--accent);
  box-shadow: var(--shadow-float);
}

.row-main {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 11px 0;
  min-height: 54px;
}

.row-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.row-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.row-sub {
  font-size: 11.5px;
  color: var(--text-meta);
}

.category-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  font-size: 13px;
  border: 2px solid #fff;
  box-shadow: 0 2px 6px rgba(60, 45, 30, 0.12);
  flex-shrink: 0;
  user-select: none;
}

.row-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.row-amount {
  font-size: 14px;
  color: var(--text);
}

/* Höhen-Animation ohne feste Höhe: Grid-Trick statt max-height-Hack. */
.expand-track {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 0.32s var(--ease-standard);
}

.row--expanded .expand-track {
  grid-template-rows: 1fr;
}

.expand-inner {
  overflow: hidden;
  min-height: 0;
}

.row-actions {
  display: flex;
  gap: 8px;
  padding-top: 11px;
  margin-bottom: 11px;
  border-top: 1px solid var(--border-softer);
}

.edit-btn {
  flex: 1;
  padding: 9px 0;
  background: var(--accent-tint);
  border: 1.5px solid var(--accent);
  border-radius: 10px;
  color: var(--accent);
  font-family: var(--font-body);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}

.delete-btn {
  flex: 1;
  padding: 9px 0;
  background: var(--danger-tint);
  border: 1.5px solid var(--danger-border);
  border-radius: 10px;
  color: var(--danger);
  font-family: var(--font-body);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}

.row-divider {
  display: none;
}
</style>

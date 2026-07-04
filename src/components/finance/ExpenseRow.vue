<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Expense, Couple } from '@/types'
import InitialChip from '@/components/ui/InitialChip.vue'

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

const tagColor = computed(() => tagColors[props.expense.category] ?? 'var(--text-faint)')

const amountFormatted = computed(() => {
  const euros = props.expense.amount / 100
  return euros.toFixed(2).replace('.', ',') + ' €'
})

const subtitle = computed(() => {
  const tagLabels: Record<string, string> = {
    food: 'Lebensmittel', transport: 'Auto', home: 'Haushalt', leisure: 'Essen', other: 'Sonstiges'
  }
  return tagLabels[props.expense.category] ?? props.expense.category
})

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
    @click="toggleExpand"
    @touchstart.passive="onTouchStart"
    @touchend.passive="onTouchEnd"
  >
    <div class="row-main">
      <InitialChip :uid="expense.paidBy" :couple="couple" :size="28" />
      <div class="row-text">
        <span class="row-title">{{ expense.title }}</span>
        <span class="row-sub">{{ subtitle }}</span>
      </div>
      <div class="row-right">
        <span class="row-amount mono">{{ amountFormatted }}</span>
        <span class="tag-dot" :style="{ background: tagColor }" />
      </div>
    </div>

    <Transition name="expand">
      <div v-if="expanded" class="row-actions">
        <button class="edit-btn" @click.stop="emit('edit', expense)">
          Bearbeiten
        </button>
        <button class="delete-btn" @click.stop="emit('delete', expense.id)">
          Löschen
        </button>
      </div>
    </Transition>

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

.tag-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}

.row-actions {
  padding-bottom: 10px;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.edit-btn {
  padding: 7px 16px;
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
  padding: 7px 16px;
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

.expand-enter-active,
.expand-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>

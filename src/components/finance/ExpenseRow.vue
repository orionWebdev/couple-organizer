<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Expense, Couple } from '@/types'
import InitialChip from '@/components/ui/InitialChip.vue'

const props = defineProps<{
  expense: Expense
  couple: Couple | null
  currentUserId: string
}>()

const emit = defineEmits<{ delete: [id: string] }>()

const expanded = ref(false)

const tagColors: Record<string, string> = {
  food:      'var(--accent)',
  transport: 'var(--sarah)',
  home:      '#a99ac2',
  leisure:   '#c98a7e',
  other:     'var(--chris)',
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
        <button class="delete-btn" @click.stop="emit('delete', expense.id)">
          Löschen
        </button>
      </div>
    </Transition>

    <div class="row-divider" />
  </div>
</template>

<style scoped>
.row {
  cursor: pointer;
  padding: 0 var(--screen-pad);
}

.row-main {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 13px 0;
  min-height: 56px;
}

.row-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.row-title {
  font-size: 15px;
  font-weight: 500;
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
  font-size: 15px;
  font-weight: 500;
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
}

.delete-btn {
  padding: 7px 16px;
  background: var(--danger-tint);
  border: 1px solid var(--danger-border);
  border-radius: 8px;
  color: var(--danger);
  font-family: 'Mali', system-ui, sans-serif;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.row-divider {
  height: 1px;
  background: var(--border-softer);
  margin: 0;
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

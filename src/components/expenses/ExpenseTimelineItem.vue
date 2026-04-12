<script setup lang="ts">
import { computed } from 'vue'
import { IonIcon } from '@ionic/vue'
import {
  cartOutline,
  filmOutline,
  homeOutline,
  trainOutline,
  walletOutline
} from 'ionicons/icons'
import type { Expense } from '@/types'

const props = withDefaults(defineProps<{
  expense: Readonly<Expense>
  payerName: string
  categoryLabel: string
  showEditAction?: boolean
}>(), {
  showEditAction: false
})

const emit = defineEmits<{
  edit: [expense: Readonly<Expense>]
  togglePaid: [id: string, paid: boolean]
}>()

const icon = computed(() => {
  return {
    food: cartOutline,
    transport: trainOutline,
    home: homeOutline,
    leisure: filmOutline,
    other: walletOutline
  }[props.expense.category] || walletOutline
})

const accentClass = computed(() => {
  return {
    food: 'bg-emerald-500/14 text-emerald-300',
    transport: 'bg-sky-500/14 text-sky-300',
    home: 'bg-amber-500/14 text-amber-300',
    leisure: 'bg-violet-500/14 text-violet-300',
    other: 'bg-slate-500/14 text-slate-300'
  }[props.expense.category] || 'bg-slate-500/14 text-slate-300'
})

function formatEuro(cents: number): string {
  return `${(cents / 100).toFixed(2)} €`
}

function handleRowClick() {
  if (!props.showEditAction) return
  emit('edit', props.expense)
}

function handleTogglePaid(e: MouseEvent) {
  e.stopPropagation()
  emit('togglePaid', props.expense.id, !props.expense.isPaid)
}
</script>

<template>
  <article
    class="timeline-row"
    :class="{
      'timeline-row--clickable': showEditAction,
      'timeline-row--paid': expense.isPaid
    }"
    :role="showEditAction ? 'button' : undefined"
    :tabindex="showEditAction ? 0 : undefined"
    @click="handleRowClick"
    @keydown.enter="handleRowClick"
    @keydown.space.prevent="handleRowClick"
  >
    <div class="timeline-icon" :class="accentClass">
      <ion-icon :icon="icon" class="text-lg" />
    </div>
    <div class="min-w-0 flex-1">
      <p class="truncate text-[1.05rem] font-semibold text-slate-100">
        {{ expense.title }}
      </p>
      <p class="mt-1 truncate text-sm text-slate-400">
        Bezahlt von {{ payerName }} · {{ categoryLabel }}
      </p>
    </div>
    <p class="shrink-0 text-[1.1rem] font-semibold text-slate-50">
      {{ formatEuro(expense.amount) }}
    </p>

    <!-- Paid toggle (stops propagation so it doesn't also open edit) -->
    <button
      type="button"
      class="paid-toggle"
      :class="{ 'paid-toggle--paid': expense.isPaid }"
      :aria-label="expense.isPaid ? 'Als unbezahlt markieren' : 'Als bezahlt markieren'"
      :aria-pressed="expense.isPaid"
      @click="handleTogglePaid"
    >
      <svg v-if="expense.isPaid" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M5 13l4 4L19 7" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </button>
  </article>
</template>

<style scoped>
.timeline-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.25rem 0;
  border-radius: 0.75rem;
  transition: opacity 0.18s ease, background 0.14s ease, transform 0.1s ease;
  -webkit-tap-highlight-color: transparent;
}

.timeline-row--clickable {
  cursor: pointer;
}

.timeline-row--clickable:active {
  transform: scale(0.992);
  background: rgba(30, 41, 59, 0.55);
}

.timeline-row--paid {
  opacity: 0.58;
}

.timeline-row--paid .text-slate-100,
.timeline-row--paid .text-slate-50 {
  text-decoration: line-through;
  text-decoration-color: rgba(148, 163, 184, 0.55);
  text-decoration-thickness: 1.5px;
}

.timeline-icon {
  display: inline-flex;
  height: 3rem;
  width: 3rem;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 9999px;
}

/* ── Paid toggle ───────────────────────────────────────────── */
.paid-toggle {
  flex-shrink: 0;
  width: 2rem;
  height: 2rem;
  border-radius: 9999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 2px solid rgba(71, 85, 105, 0.9);
  background: transparent;
  color: #fff;
  transition: background 0.14s, border-color 0.14s, transform 0.1s;
  -webkit-tap-highlight-color: transparent;
  cursor: pointer;
}

.paid-toggle:active {
  transform: scale(0.92);
}

.paid-toggle--paid {
  background: var(--app-success);
  border-color: var(--app-success);
}

.paid-toggle svg {
  width: 1rem;
  height: 1rem;
}
</style>

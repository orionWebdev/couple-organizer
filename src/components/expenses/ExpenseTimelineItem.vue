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
</script>

<template>
  <article class="timeline-row">
    <div class="timeline-icon" :class="accentClass">
      <ion-icon :icon="icon" class="text-lg" />
    </div>
    <div class="min-w-0 flex-1">
      <p class="truncate text-[1.05rem] font-semibold text-slate-100">{{ expense.title }}</p>
      <p class="mt-1 truncate text-sm text-slate-400">
        Bezahlt von {{ payerName }} · {{ categoryLabel }}
      </p>
    </div>
    <p class="shrink-0 text-[1.1rem] font-semibold text-slate-50">{{ formatEuro(expense.amount) }}</p>
    <button
      v-if="showEditAction"
      type="button"
      class="timeline-edit-button"
      @click="emit('edit', expense)"
    >
      Bearbeiten
    </button>
  </article>
</template>

<style scoped>
.timeline-row {
  display: flex;
  align-items: center;
  gap: 1rem;
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

.timeline-edit-button {
  flex-shrink: 0;
  border-radius: 9999px;
  border: 1px solid rgba(71, 85, 105, 0.9);
  background: rgba(15, 23, 42, 0.65);
  padding: 0.45rem 0.85rem;
  font-size: 1.1rem;
  font-weight: 600;
  color: rgb(226, 232, 240);
}
</style>

<script setup lang="ts">
import { computed } from 'vue'
import { useTodos } from '@/composables/useTodos'
import { useShopping } from '@/composables/useShopping'
import { useExpenses } from '@/composables/useExpenses'
import type { Couple } from '@/types'

const props = defineProps<{
  coupleId: string
  couple: Couple | null
}>()

const emit = defineEmits<{
  switchTab: [tab: string]
}>()

const coupleIdRef = computed<string | null>(() => props.coupleId)
const { todos } = useTodos(coupleIdRef)
const { items: shoppingItems } = useShopping(coupleIdRef)
const { balanceInfo } = useExpenses(coupleIdRef)

const openTodos = computed(() => todos.value.filter(t => !t.done))
const unboughtItems = computed(() => shoppingItems.value.filter(i => !i.bought))

const balanceSummary = computed(() => {
  if (!props.couple || Object.keys(balanceInfo.value.balances).length === 0) return null
  const entries = Object.entries(balanceInfo.value.balances)
  const creditor = entries.find(([_, b]) => b > 0)
  const debtor = entries.find(([_, b]) => b < 0)
  if (!creditor || !debtor) return null
  return {
    debtorName: props.couple.memberNames[debtor[0]] || 'Unbekannt',
    creditorName: props.couple.memberNames[creditor[0]] || 'Unbekannt',
    amount: Math.abs(debtor[1])
  }
})

function formatEuro(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',')
}
</script>

<template>
  <div class="space-y-4">
    <!-- Aufgaben Card -->
    <button
      @click="emit('switchTab', 'todos')"
      class="w-full text-left bg-slate-800 rounded-2xl border border-slate-700 p-4 transition-colors hover:border-slate-600"
    >
      <div class="flex items-center justify-between mb-3">
        <h3 class="font-semibold text-slate-100">Aufgaben</h3>
        <span class="text-xs text-slate-400 bg-slate-700 rounded-full px-2.5 py-1">
          {{ openTodos.length }} offen
        </span>
      </div>
      <div v-if="openTodos.length > 0" class="space-y-2">
        <div
          v-for="todo in openTodos.slice(0, 3)"
          :key="todo.id"
          class="flex items-center gap-2 text-sm text-slate-300"
        >
          <div class="h-1.5 w-1.5 rounded-full bg-green-500 shrink-0"></div>
          <span class="truncate">{{ todo.title }}</span>
        </div>
        <p v-if="openTodos.length > 3" class="text-xs text-slate-500">
          +{{ openTodos.length - 3 }} weitere
        </p>
      </div>
      <p v-else class="text-sm text-slate-500">Alle Aufgaben erledigt!</p>
    </button>

    <!-- Einkaufsliste Card -->
    <button
      @click="emit('switchTab', 'shopping')"
      class="w-full text-left bg-slate-800 rounded-2xl border border-slate-700 p-4 transition-colors hover:border-slate-600"
    >
      <div class="flex items-center justify-between mb-3">
        <h3 class="font-semibold text-slate-100">Einkaufsliste</h3>
        <span class="text-xs text-slate-400 bg-slate-700 rounded-full px-2.5 py-1">
          {{ unboughtItems.length }} übrig
        </span>
      </div>
      <div v-if="unboughtItems.length > 0" class="space-y-2">
        <div
          v-for="item in unboughtItems.slice(0, 3)"
          :key="item.id"
          class="flex items-center gap-2 text-sm text-slate-300"
        >
          <div class="h-1.5 w-1.5 rounded-full bg-green-500 shrink-0"></div>
          <span class="truncate">{{ item.name }}</span>
        </div>
        <p v-if="unboughtItems.length > 3" class="text-xs text-slate-500">
          +{{ unboughtItems.length - 3 }} weitere
        </p>
      </div>
      <p v-else class="text-sm text-slate-500">Einkaufsliste ist leer</p>
    </button>

    <!-- Finanzen Card -->
    <button
      @click="emit('switchTab', 'expenses')"
      class="w-full text-left bg-slate-800 rounded-2xl border border-slate-700 p-4 transition-colors hover:border-slate-600"
    >
      <div class="flex items-center justify-between mb-3">
        <h3 class="font-semibold text-slate-100">Finanzen</h3>
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </div>
      <div v-if="balanceInfo.totalSpent === 0" class="text-sm text-slate-500">
        Noch keine Ausgaben
      </div>
      <div v-else-if="balanceSummary && balanceSummary.amount > 0">
        <p class="text-sm text-slate-300">
          <span class="text-red-400 font-medium">{{ balanceSummary.debtorName }}</span>
          schuldet
          <span class="text-green-400 font-medium">{{ balanceSummary.creditorName }}</span>
        </p>
        <p class="text-2xl font-bold text-green-400 mt-1">{{ formatEuro(balanceSummary.amount) }} €</p>
      </div>
      <div v-else>
        <p class="text-sm text-green-400 font-medium">Alles ausgeglichen!</p>
      </div>
    </button>
  </div>
</template>

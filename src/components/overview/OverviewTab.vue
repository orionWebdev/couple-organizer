<script setup lang="ts">
import { computed } from 'vue'
import {
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonBadge,
  IonIcon
} from '@ionic/vue'
import { chevronForwardOutline } from 'ionicons/icons'
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
const unboughtItems = computed(() => shoppingItems.value.filter(i => !i.checked))

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
    <ion-card button @click="emit('switchTab', 'todos')">
      <ion-card-header>
        <div class="flex items-center justify-between">
          <ion-card-title class="text-base font-semibold">Aufgaben</ion-card-title>
          <ion-badge color="medium">{{ openTodos.length }} offen</ion-badge>
        </div>
      </ion-card-header>
      <ion-card-content>
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
      </ion-card-content>
    </ion-card>

    <!-- Einkaufsliste Card -->
    <ion-card button @click="emit('switchTab', 'shopping')">
      <ion-card-header>
        <div class="flex items-center justify-between">
          <ion-card-title class="text-base font-semibold">Einkaufsliste</ion-card-title>
          <ion-badge color="medium">{{ unboughtItems.length }} übrig</ion-badge>
        </div>
      </ion-card-header>
      <ion-card-content>
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
      </ion-card-content>
    </ion-card>

    <!-- Finanzen Card -->
    <ion-card button @click="emit('switchTab', 'expenses')">
      <ion-card-header>
        <div class="flex items-center justify-between">
          <ion-card-title class="text-base font-semibold">Finanzen</ion-card-title>
          <ion-icon :icon="chevronForwardOutline" class="text-slate-500" />
        </div>
      </ion-card-header>
      <ion-card-content>
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
      </ion-card-content>
    </ion-card>
  </div>
</template>

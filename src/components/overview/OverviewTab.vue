<script setup lang="ts">
import { computed } from 'vue'
import { IonIcon } from '@ionic/vue'
import {
  cartOutline,
  checkmarkOutline,
  checkmarkCircle,
  notificationsOutline,
  receiptOutline
} from 'ionicons/icons'
import { useAuth } from '@/composables/useAuth'
import { useTodos } from '@/composables/useTodos'
import { useShopping } from '@/composables/useShopping'
import { useExpenses } from '@/composables/useExpenses'
import type { Couple, ShoppingItem, Todo } from '@/types'
import OverviewAvatar from './OverviewAvatar.vue'
import OverviewSectionCard from './OverviewSectionCard.vue'
import OverviewStatCard from './OverviewStatCard.vue'

const props = defineProps<{
  coupleId: string
  couple: Couple | null
}>()

const emit = defineEmits<{
  switchTab: [tab: string, intent?: 'default' | 'create']
}>()

const { user } = useAuth()
const coupleIdRef = computed<string | null>(() => props.coupleId)
const { todos } = useTodos(coupleIdRef)
const { items: shoppingItems } = useShopping(coupleIdRef)
const { balanceInfo } = useExpenses(coupleIdRef)

const openTodos = computed(() => todos.value.filter((todo) => !todo.done))
const completedTodos = computed(() => todos.value.filter((todo) => todo.done))
const unboughtItems = computed(() => shoppingItems.value.filter((item) => !item.checked))

const todoPreview = computed(() => {
  const preview = [
    ...openTodos.value.slice(0, 2),
    ...completedTodos.value.slice(0, 1),
    ...openTodos.value.slice(2)
  ]
  return preview.slice(0, 3)
})

const shoppingPreview = computed(() => unboughtItems.value.slice(0, 3))

const coupleNames = computed(() => {
  if (!props.couple) return user.value?.displayName || 'Paarplaner'
  return Object.values(props.couple.memberNames).join(' & ')
})

const greeting = computed(() => {
  const hour = new Date().getHours()
  if (hour < 11) return 'Guten Morgen,'
  if (hour < 17) return 'Guten Tag,'
  return 'Guten Abend,'
})

const memberEntries = computed(() => {
  if (!props.couple) return []
  return Object.entries(props.couple.memberNames).map(([uid, name], index) => ({
    uid,
    name,
    tone: getTone(index)
  }))
})

const expenseMembers = computed(() => {
  return memberEntries.value.map((member) => ({
    ...member,
    paid: balanceInfo.value.totals[member.uid] || 0
  }))
})

const balanceSummary = computed(() => {
  if (!props.couple || Object.keys(balanceInfo.value.balances).length === 0) return null

  const entries = Object.entries(balanceInfo.value.balances)
  const creditor = entries.find(([_, balance]) => balance > 0)
  const debtor = entries.find(([_, balance]) => balance < 0)

  if (!creditor || !debtor) return null

  return {
    debtorName: props.couple.memberNames[debtor[0]] || 'Unbekannt',
    creditorName: props.couple.memberNames[creditor[0]] || 'Unbekannt',
    amount: Math.abs(debtor[1])
  }
})

function getTone(index: number): 'green' | 'blue' | 'amber' | 'rose' {
  return ['green', 'blue', 'amber', 'rose'][index % 4] as 'green' | 'blue' | 'amber' | 'rose'
}

function getMemberName(uid: string | null): string {
  if (!uid) return 'Nicht zugewiesen'
  return props.couple?.memberNames[uid] || 'Nicht zugewiesen'
}

function getMemberTone(uid: string | null): 'green' | 'blue' | 'amber' | 'rose' {
  if (!uid) return 'green'
  const index = memberEntries.value.findIndex((member) => member.uid === uid)
  return getTone(index >= 0 ? index : 0)
}

function formatTodoSubtitle(todo: Todo): string {
  return todo.assignedTo ? `Zugewiesen an ${getMemberName(todo.assignedTo)}` : 'Noch nicht zugewiesen'
}

function formatShoppingMeta(item: ShoppingItem): string {
  return item.category || 'Einkauf'
}

function formatEuro(cents: number): string {
  return `${(cents / 100).toFixed(2)} €`
}
</script>

<template>
  <div class="space-y-5 pb-4">
    <section class="dashboard-hero">
      <div>
        <p class="text-sm font-medium text-slate-400">{{ greeting }}</p>
        <h1 class="mt-1 text-[2rem] font-semibold tracking-tight text-slate-50">
          {{ coupleNames }}
        </h1>
      </div>

      <div class="flex items-center gap-3">
        <button type="button" class="dashboard-icon-button" aria-label="Benachrichtigungen">
          <ion-icon :icon="notificationsOutline" class="text-xl" />
        </button>
        <OverviewAvatar
          :name="user?.displayName || 'Du'"
          size="lg"
          tone="blue"
        />
      </div>
    </section>

    <section class="grid grid-cols-2 gap-4">
      <OverviewStatCard
        :icon="checkmarkOutline"
        label="Offene Aufgaben"
        :value="openTodos.length"
        accent="green"
      />
      <OverviewStatCard
        :icon="cartOutline"
        label="Einzukaufen"
        :value="unboughtItems.length"
        accent="blue"
      />
    </section>

    <OverviewSectionCard title="Aufgaben" action-label="+ Aufgabe" @action="emit('switchTab', 'todos', 'create')">
      <div v-if="todoPreview.length > 0" class="space-y-5">
        <article
          v-for="todo in todoPreview"
          :key="todo.id"
          class="flex items-center gap-3"
        >
          <div
            class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border"
            :class="todo.done ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-500/80 text-transparent'"
          >
            <ion-icon v-if="todo.done" :icon="checkmarkCircle" class="text-lg" />
          </div>

          <div class="min-w-0 flex-1">
            <p
              class="truncate text-[1.05rem] font-medium"
              :class="todo.done ? 'text-slate-500 line-through' : 'text-slate-100'"
            >
              {{ todo.title }}
            </p>
            <p class="mt-1 truncate text-sm" :class="todo.done ? 'text-slate-600 line-through' : 'text-slate-400'">
              {{ formatTodoSubtitle(todo) }}
            </p>
          </div>

          <OverviewAvatar
            :name="getMemberName(todo.assignedTo)"
            size="sm"
            :tone="getMemberTone(todo.assignedTo)"
          />
        </article>
      </div>
      <p v-else class="py-6 text-sm text-slate-400">Keine offenen Aufgaben mehr.</p>
    </OverviewSectionCard>

    <OverviewSectionCard title="Einkaufsliste" action-label="+ Artikel" @action="emit('switchTab', 'shopping', 'create')">
      <div v-if="shoppingPreview.length > 0" class="space-y-5">
        <article
          v-for="item in shoppingPreview"
          :key="item.id"
          class="flex items-center gap-3"
        >
          <span class="h-2.5 w-2.5 shrink-0 rounded-full bg-sky-400"></span>
          <div class="min-w-0 flex-1">
            <p class="truncate text-[1.05rem] font-medium text-slate-100">{{ item.name }}</p>
          </div>
          <span class="dashboard-meta-pill">
            {{ formatShoppingMeta(item) }}
          </span>
        </article>
      </div>
      <p v-else class="py-6 text-sm text-slate-400">Die Einkaufsliste ist aktuell leer.</p>
    </OverviewSectionCard>

    <OverviewSectionCard title="Ausgabenbilanz" action-label="+ Ausgabe" dark @action="emit('switchTab', 'expenses', 'create')">
      <div class="space-y-6 text-center">
        <div>
          <p v-if="balanceSummary" class="text-base text-slate-400">
            {{ balanceSummary.debtorName }} schuldet {{ balanceSummary.creditorName }}
          </p>
          <p v-else class="text-base text-slate-400">
            {{ balanceInfo.totalSpent === 0 ? 'Noch keine Ausgaben' : 'Alles ausgeglichen' }}
          </p>
          <p class="mt-2 text-5xl font-semibold tracking-tight text-white">
            {{ balanceSummary ? formatEuro(balanceSummary.amount) : formatEuro(0) }}
          </p>
        </div>

        <div class="grid gap-3 rounded-[1.35rem] border border-slate-700/80 bg-slate-800/65 p-4 sm:grid-cols-2">
          <div
            v-for="member in expenseMembers"
            :key="member.uid"
            class="flex items-center gap-3 rounded-2xl bg-slate-900/30 px-3 py-3 text-left"
          >
            <div
              class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
              :class="member.paid > 0 ? 'bg-emerald-500/16 text-emerald-300' : 'bg-rose-500/16 text-rose-300'"
            >
              <ion-icon :icon="receiptOutline" />
            </div>
            <div>
              <p class="text-sm text-slate-400">{{ member.name }} bezahlt</p>
              <p class="text-xl font-semibold text-white">{{ formatEuro(member.paid) }}</p>
            </div>
          </div>
        </div>
      </div>
    </OverviewSectionCard>
  </div>
</template>

<style scoped>
.dashboard-hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding-top: 0.25rem;
}

.dashboard-icon-button {
  display: inline-flex;
  height: 3.25rem;
  width: 3.25rem;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(71, 85, 105, 0.55);
  border-radius: 9999px;
  background: linear-gradient(180deg, rgba(30, 41, 59, 0.96), rgba(15, 23, 42, 0.96));
  color: rgb(226 232 240);
  box-shadow: 0 14px 28px rgba(2, 6, 23, 0.16);
  transition: transform 150ms ease, border-color 150ms ease, background 150ms ease;
}

.dashboard-icon-button:hover {
  transform: translateY(-1px);
  border-color: rgba(96, 165, 250, 0.45);
}

.dashboard-meta-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 3rem;
  padding: 0.35rem 0.7rem;
  border-radius: 0.9rem;
  background: rgba(51, 65, 85, 0.7);
  color: rgb(191 219 254);
  font-size: 0.8rem;
  font-weight: 600;
}
</style>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAuth } from '@/composables/useAuth'
import { useCouple } from '@/composables/useCouple'
import { useExpenses } from '@/composables/useExpenses'
import { showToast } from '@/composables/useToast'
import BalanceCard from '@/components/finance/BalanceCard.vue'
import ExpenseRow from '@/components/finance/ExpenseRow.vue'
import AddExpenseSheet from '@/components/finance/AddExpenseSheet.vue'
import BottomSheet from '@/components/ui/BottomSheet.vue'

const { user } = useAuth()
const { couple } = useCouple()

const coupleId = computed(() => user.value?.coupleId ?? null)
const {
  expenses,
  balanceInfo,
  loading,
  addExpense,
  deleteExpense,
  markAllPaid,
} = useExpenses(coupleId)

const showAdd = ref(false)
const showSettle = ref(false)

async function onSubmitExpense(payload: Parameters<typeof addExpense>[0]) {
  await addExpense(payload)
  showAdd.value = false
  showToast('Ausgabe gespeichert')
}

async function onDeleteExpense(id: string) {
  await deleteExpense(id)
  showToast('Ausgabe gelöscht')
}

async function onSettle() {
  showSettle.value = false
  const ids = expenses.value
    .filter(e => !e.isPaid)
    .map(e => e.id)
  await markAllPaid(ids)
  showToast('Saldo ausgeglichen')
}

const sortedExpenses = computed(() =>
  [...expenses.value]
    .filter(e => !e.isPaid)
    .sort((a, b) => {
      const ta = (a.createdAt as any)?.toMillis?.() ?? 0
      const tb = (b.createdAt as any)?.toMillis?.() ?? 0
      return tb - ta
    })
)
</script>

<template>
  <div class="finanzen-page">
    <!-- Header -->
    <div class="page-header">
      <h1 class="page-title">Finanzen</h1>
    </div>

    <!-- Balance card -->
    <BalanceCard
      :balanceInfo="balanceInfo"
      :couple="couple"
      :currentUserId="user?.uid ?? ''"
      @settle="showSettle = true"
    />

    <!-- Expense list -->
    <div v-if="loading" class="loading-row">Laden…</div>
    <div v-else-if="sortedExpenses.length === 0" class="empty-state">
      Noch keine Ausgaben. Füge die erste hinzu.
    </div>
    <div v-else class="expense-list">
      <ExpenseRow
        v-for="exp in sortedExpenses"
        :key="exp.id"
        :expense="exp"
        :couple="couple"
        :currentUserId="user?.uid ?? ''"
        @delete="onDeleteExpense"
      />
    </div>

    <!-- FAB -->
    <button class="fab" @click="showAdd = true">Ausgabe +</button>

    <!-- Add expense sheet -->
    <AddExpenseSheet
      :isOpen="showAdd"
      :couple="couple"
      :currentUserId="user?.uid ?? ''"
      @close="showAdd = false"
      @submit="onSubmitExpense"
    />

    <!-- Settle confirmation -->
    <BottomSheet :isOpen="showSettle" title="Saldo begleichen?" @close="showSettle = false">
      <p class="settle-text">
        Alle offenen Ausgaben werden als beglichen markiert. Der Saldo wird auf 0 gesetzt.
      </p>
      <button class="btn-primary" @click="onSettle">Begleichen</button>
      <button class="cancel-btn" @click="showSettle = false">Abbrechen</button>
    </BottomSheet>
  </div>
</template>

<style scoped>
.finanzen-page {
  min-height: 100%;
  padding-bottom: 24px;
}

.page-header {
  padding: calc(var(--safe-top) + 20px) var(--screen-pad) 20px;
}

.page-title {
  font-size: 22px;
  font-weight: 600;
  color: var(--text);
  margin: 0;
}

.loading-row,
.empty-state {
  padding: 40px var(--screen-pad);
  color: var(--text-faint);
  font-size: 14px;
  text-align: center;
}

.expense-list {
  border-top: 1px solid var(--border-softer);
}

.fab {
  position: fixed;
  bottom: calc(72px + var(--safe-bottom));
  right: 22px;
  padding: 13px 20px;
  background: var(--accent);
  color: #14110d;
  border: none;
  border-radius: 100px;
  font-family: 'Hanken Grotesk', system-ui, sans-serif;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
  transition: background 0.18s ease, transform 0.12s ease;
  z-index: 50;
}

.fab:active {
  background: var(--accent-hover);
  transform: scale(0.96);
}

.settle-text {
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.5;
  margin: 0 0 20px;
}

.cancel-btn {
  display: block;
  width: 100%;
  padding: 14px;
  background: none;
  border: none;
  color: var(--text-faint);
  font-family: 'Hanken Grotesk', system-ui, sans-serif;
  font-size: 14px;
  cursor: pointer;
  margin-top: 10px;
}
</style>

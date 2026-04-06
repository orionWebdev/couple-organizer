<script setup lang="ts">
import { computed } from 'vue'
import type { Couple } from '@/types'

const props = defineProps<{
  balances: Record<string, number>
  totals: Record<string, number>
  totalSpent: number
  couple: Couple | null
}>()

const members = computed(() => {
  if (!props.couple) return []
  return Object.entries(props.couple.memberNames).map(([uid, name], index) => ({
    uid,
    name,
    paid: props.totals[uid] || 0,
    tone: index % 2 === 0 ? 'green' : 'blue'
  }))
})

const summary = computed(() => {
  if (!props.couple || Object.keys(props.balances).length === 0) return null

  const entries = Object.entries(props.balances)
  const creditor = entries.find(([_, balance]) => balance > 0)
  const debtor = entries.find(([_, balance]) => balance < 0)

  if (!creditor || !debtor) return null

  return {
    amount: Math.abs(debtor[1]),
    text: `${props.couple.memberNames[debtor[0]] || 'Unbekannt'} schuldet ${props.couple.memberNames[creditor[0]] || 'Unbekannt'}`
  }
})

function formatEuro(cents: number): string {
  return `${(cents / 100).toFixed(2)} €`
}
</script>

<template>
  <section class="balance-card">
    <div class="text-center">
      <p class="text-lg text-slate-400">Aktuelle Bilanz</p>
      <p v-if="summary" class="mt-3 text-5xl font-semibold tracking-tight text-emerald-400">
        {{ formatEuro(summary.amount) }}
      </p>
      <p v-else class="mt-3 text-5xl font-semibold tracking-tight text-slate-100">
        {{ formatEuro(0) }}
      </p>
      <p class="mt-3 text-base text-slate-400">
        {{ summary ? summary.text : (totalSpent === 0 ? 'Noch keine offenen Ausgaben' : 'Alles ist ausgeglichen') }}
      </p>
    </div>

    <div class="mt-6 grid gap-3 rounded-[1.4rem] border border-slate-700/80 bg-slate-800/60 p-4 sm:grid-cols-2">
      <div
        v-for="member in members"
        :key="member.uid"
        class="rounded-2xl bg-slate-900/30 px-4 py-3"
      >
        <p class="text-sm text-slate-400">{{ member.name }} bezahlt</p>
        <p class="mt-1 text-2xl font-semibold text-white">{{ formatEuro(member.paid) }}</p>
      </div>
    </div>
  </section>
</template>

<style scoped>
.balance-card {
  border: 1px solid rgba(71, 85, 105, 0.5);
  border-radius: 1.9rem;
  padding: 1.6rem;
  background: linear-gradient(180deg, rgba(16, 24, 44, 0.98), rgba(9, 14, 28, 0.98));
  box-shadow: 0 18px 40px rgba(2, 6, 23, 0.24);
}
</style>

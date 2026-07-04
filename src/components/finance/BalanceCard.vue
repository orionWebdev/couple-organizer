<script setup lang="ts">
import { computed } from 'vue'
import type { ExpenseBalanceSummary, Couple } from '@/types'
import InitialChip from '@/components/ui/InitialChip.vue'

const props = defineProps<{
  balanceInfo: ExpenseBalanceSummary
  couple: Couple | null
  currentUserId: string
}>()

const emit = defineEmits<{ (e: 'settle'): void }>()

const myBalance = computed(() => props.balanceInfo.balances[props.currentUserId] ?? 0)

const isSettled = computed(() => Math.abs(myBalance.value) < 1)

const partnerUid = computed(() => {
  if (!props.couple) return null
  return props.couple.memberIds.find(id => id !== props.currentUserId) ?? null
})

const partnerName = computed(() => {
  if (!props.couple || !partnerUid.value) return 'Partner'
  return props.couple.memberNames[partnerUid.value] || 'Partner'
})

const debtText = computed(() => {
  if (isSettled.value) return 'Alles ausgeglichen'
  if (myBalance.value > 0) return `${partnerName.value} schuldet dir`
  return `Du schuldest ${partnerName.value}`
})

const displayAmount = computed(() => {
  const euros = Math.abs(myBalance.value) / 100
  return euros.toFixed(2).replace('.', ',') + ' €'
})
</script>

<template>
  <div class="balance-card">
    <div class="card-label section-label">GEMEINSAMER SALDO</div>

    <div class="card-amount mono">{{ displayAmount }}</div>

    <div v-if="!isSettled" class="card-debtor">
      <InitialChip
        :uid="myBalance > 0 ? (partnerUid ?? currentUserId) : currentUserId"
        :couple="couple"
        :size="24"
      />
      <span class="debt-text">{{ debtText }}</span>
    </div>
    <div v-else class="card-debtor">
      <span class="debt-text">{{ debtText }}</span>
    </div>

    <button
      v-if="!isSettled"
      class="settle-btn"
      @click="emit('settle')"
    >
      Begleichen
    </button>
  </div>
</template>

<style scoped>
/* Nido: Türkis-Tint-Karte (Frame „Gemeinsame Kasse") */
.balance-card {
  background: var(--accent-tint);
  border: 1px solid rgba(255, 255, 255, 0.55);
  border-radius: 22px;
  padding: 18px;
  margin: 0 var(--screen-pad) 24px;
  position: relative;
  overflow: hidden;
}

.card-label {
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.card-amount {
  font-size: 36px;
  font-weight: 700;
  color: var(--text);
  line-height: 1.1;
  margin-bottom: 10px;
}

.card-debtor {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 18px;
}

.debt-text {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-secondary);
}

.settle-btn {
  width: 100%;
  padding: 13px;
  background: var(--accent);
  color: var(--on-accent);
  border: none;
  border-radius: 14px;
  font-family: var(--font-body);
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: var(--shadow-accent);
  transition: background 0.18s ease;
}

.settle-btn:active {
  background: var(--accent-hover);
}
</style>

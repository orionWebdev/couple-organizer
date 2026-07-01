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
.balance-card {
  background: linear-gradient(150deg, #e7efe7 0%, #f7f1de 58%);
  border: 1px solid #cfe0d2;
  border-radius: 22px;
  padding: 22px;
  margin: 0 var(--screen-pad) 24px;
  position: relative;
  overflow: hidden;
}

.balance-card::before {
  content: '';
  position: absolute;
  top: -20px;
  left: -20px;
  width: 120px;
  height: 120px;
  background: radial-gradient(circle, rgba(134,165,150,.12) 0%, transparent 70%);
  pointer-events: none;
}

.card-label {
  color: var(--text-faint);
  margin-bottom: 12px;
  letter-spacing: 0.14em;
}

.card-amount {
  font-size: 42px;
  font-weight: 600;
  color: var(--text);
  line-height: 1;
  margin-bottom: 12px;
  text-align: center;
}

.card-debtor {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 18px;
}

.debt-text {
  font-size: 14px;
  color: var(--text-secondary);
}

.settle-btn {
  width: 100%;
  padding: 13px;
  background: var(--accent);
  color: var(--on-accent);
  border: none;
  border-radius: 13px;
  font-family: 'Mali', system-ui, sans-serif;
  font-size: 14.5px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.18s ease;
}

.settle-btn:active {
  background: var(--accent-hover);
}
</style>

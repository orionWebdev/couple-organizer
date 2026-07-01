<script setup lang="ts">
import { ref, computed } from 'vue'
import type { ShoppingItem, ShoppingList, Couple } from '@/types'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import NumericKeypad from '@/components/finance/NumericKeypad.vue'

const props = defineProps<{
  list: ShoppingList
  items: ShoppingItem[]
  couple: Couple | null
  currentUserId: string
}>()

const emit = defineEmits<{
  toggle: [id: string, checked: boolean]
  finish: [payload: {
    checkedIds: string[]
    createExpense: boolean
    amountInCents: number
    paidBy: string
  }]
}>()

const showCheckout = ref(false)
const rawAmount = ref('')
const paidBy = ref(props.currentUserId)
const createExpense = ref(true)

const sortedItems = computed(() =>
  [...props.items].sort((a, b) => {
    if (a.checked !== b.checked) return a.checked ? 1 : -1
    return 0
  })
)

const checkedCount = computed(() => props.items.filter(i => i.checked).length)

const displayAmount = computed(() => {
  if (!rawAmount.value) return '0,00'
  const n = parseFloat(rawAmount.value)
  return isNaN(n) ? '0,00' : n.toFixed(2).replace('.', ',')
})

const partnerUid = computed(() => {
  if (!props.couple) return null
  return props.couple.memberIds.find(id => id !== props.currentUserId) ?? null
})

function personTint(uid: string) {
  if (!props.couple) return 'transparent'
  return props.couple.memberIds.indexOf(uid) === 0 ? 'var(--chris-tint)' : 'var(--sarah-tint)'
}

function personColor(uid: string) {
  if (!props.couple) return 'var(--text-faint)'
  return props.couple.memberIds.indexOf(uid) === 0 ? 'var(--chris)' : 'var(--sarah)'
}

function personName(uid: string) {
  return props.couple?.memberNames[uid] ?? uid
}

function handleFinish() {
  const checkedIds = props.items.filter(i => i.checked).map(i => i.id)
  const amountInCents = Math.round((parseFloat(rawAmount.value) || 0) * 100)
  emit('finish', {
    checkedIds,
    createExpense: createExpense.value && amountInCents > 0,
    amountInCents,
    paidBy: paidBy.value
  })
}
</script>

<template>
  <div class="shopping-mode">
    <!-- Header -->
    <div class="mode-header">
      <div class="mode-title-row">
        <h2 class="mode-title">{{ list.title }}</h2>
        <span class="mode-progress mono">{{ checkedCount }} / {{ items.length }}</span>
      </div>
      <button class="end-btn" @click="showCheckout = true">Beenden</button>
    </div>

    <!-- Big checkbox rows -->
    <div class="mode-items">
      <div
        v-for="item in sortedItems"
        :key="item.id"
        class="mode-row"
        :class="{ 'mode-row--checked': item.checked }"
        @click="emit('toggle', item.id, !item.checked)"
      >
        <div class="mode-cb" :class="{ 'mode-cb--checked': item.checked }">
          <svg
            class="shopping-check"
            :class="{ 'is-hidden': !item.checked }"
            width="20" height="20" viewBox="0 0 20 20" fill="none"
          >
            <path d="M3 10l5 5 9-9" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <span class="mode-name">{{ item.name }}</span>
        <span v-if="item.amount" class="mode-amount mono">
          {{ item.amount }}{{ item.unit ? ' ' + item.unit : '' }}
        </span>
      </div>
    </div>

    <!-- Checkout sheet -->
    <BottomSheet :isOpen="showCheckout" title="Einkauf beenden" @close="showCheckout = false">
      <div class="checkout-amount">
        <span class="co-value mono">{{ displayAmount }}</span>
        <span class="co-currency">€</span>
      </div>

      <!-- Toggle: create expense -->
      <div class="co-toggle-row">
        <span class="co-label">Als Ausgabe erfassen</span>
        <button
          class="toggle-pill"
          :class="{ 'toggle-pill--on': createExpense }"
          @click="createExpense = !createExpense"
        >
          <span class="toggle-thumb" />
        </button>
      </div>

      <template v-if="createExpense">
        <!-- Payer -->
        <div class="section-label co-section">Bezahlt von</div>
        <div class="payer-row">
          <button
            class="payer-btn"
            :class="{ 'payer-btn--active': paidBy === currentUserId }"
            :style="paidBy === currentUserId ? {
              background: personTint(currentUserId),
              borderColor: personColor(currentUserId)
            } : {}"
            @click="paidBy = currentUserId"
          >
            {{ personName(currentUserId) }}
          </button>
          <button
            v-if="partnerUid"
            class="payer-btn"
            :class="{ 'payer-btn--active': paidBy === partnerUid }"
            :style="paidBy === partnerUid ? {
              background: personTint(partnerUid),
              borderColor: personColor(partnerUid)
            } : {}"
            @click="paidBy = partnerUid!"
          >
            {{ personName(partnerUid) }}
          </button>
        </div>

        <!-- Keypad -->
        <NumericKeypad v-model="rawAmount" class="co-keypad" />
      </template>

      <button class="btn-primary co-submit" @click="handleFinish">
        Abschließen
      </button>
    </BottomSheet>
  </div>
</template>

<style scoped>
.shopping-mode {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--bg);
}

.mode-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: calc(var(--safe-top) + 16px) var(--screen-pad) 16px;
  border-bottom: 1px solid var(--border-softer);
}

.mode-title-row {
  flex: 1;
  display: flex;
  align-items: baseline;
  gap: 10px;
  min-width: 0;
}

.mode-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mode-progress {
  font-size: 14px;
  color: var(--text-meta);
  flex-shrink: 0;
}

.end-btn {
  padding: 9px 18px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  color: var(--text);
  font-family: 'Mali', system-ui, sans-serif;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  flex-shrink: 0;
}

.mode-items {
  flex: 1;
  overflow-y: auto;
}

.mode-row {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 14px var(--screen-pad);
  min-height: 64px;
  border-bottom: 1px solid var(--border-softer);
  cursor: pointer;
  /* row stays visible when done, just dims (Stamp choreography 3–4) */
  transition: opacity var(--dur-base) var(--ease-standard);
}

.mode-row--checked {
  opacity: 0.55;
}

.mode-cb {
  width: 38px;
  height: 38px;
  border-radius: 12px;
  border: 2px solid var(--border);
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: var(--on-accent);
  /* fill snaps in fast; the check does the playful part */
  transition: background-color 150ms var(--ease-standard),
              border-color 150ms var(--ease-standard);
}

.mode-cb--checked {
  background: var(--accent);
  border-color: var(--accent);
}

/* the check "stamps" onto the box */
.shopping-check {
  transform: scale(1) rotate(0deg);
  opacity: 1;
  transition: transform var(--dur-pop) var(--ease-overshoot),
              opacity var(--dur-fast) var(--ease-standard);
}

.shopping-check.is-hidden {
  transform: scale(1.8) rotate(-14deg);
  opacity: 0;
}

.mode-name {
  flex: 1;
  font-size: 18px;
  font-weight: 500;
  color: var(--text);
}

.mode-row--checked .mode-name {
  text-decoration: line-through;
}

.mode-amount {
  font-size: 14px;
  color: var(--text-meta);
}

/* Checkout */
.checkout-amount {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 6px;
  margin-bottom: 20px;
}

.co-value {
  font-size: 36px;
  font-weight: 600;
  color: var(--text);
  line-height: 1;
}

.co-currency {
  font-family: 'Geist Mono', monospace;
  font-size: 20px;
  color: var(--text-meta);
}

.co-toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.co-label {
  font-size: 15px;
  color: var(--text-secondary);
}

.toggle-pill {
  width: 46px;
  height: 26px;
  border-radius: 100px;
  background: var(--border);
  border: none;
  cursor: pointer;
  position: relative;
  transition: background 0.2s ease;
}

.toggle-pill--on {
  background: var(--accent);
}

.toggle-thumb {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #fff;
  transition: left 0.2s ease;
}

.toggle-pill--on .toggle-thumb {
  left: calc(100% - 23px);
}

.co-section {
  margin-bottom: 8px;
}

.payer-row {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.payer-btn {
  flex: 1;
  padding: 10px;
  background: var(--surface-deep);
  border: 1px solid var(--border-soft);
  border-radius: 10px;
  color: var(--text-meta);
  font-family: 'Mali', system-ui, sans-serif;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.payer-btn--active {
  color: var(--text);
}

.co-keypad {
  margin-bottom: 16px;
}

.co-submit {
  margin-bottom: 8px;
}
</style>

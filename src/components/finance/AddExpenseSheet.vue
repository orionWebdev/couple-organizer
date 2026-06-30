<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Couple } from '@/types'
import type { ExpenseCategory } from '@/types'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import NumericKeypad from './NumericKeypad.vue'

const props = defineProps<{
  isOpen: boolean
  couple: Couple | null
  currentUserId: string
}>()

const emit = defineEmits<{
  close: []
  submit: [payload: {
    title: string
    amountInCents: number
    paidBy: string
    owedBy: Record<string, number>
    category: ExpenseCategory
  }]
}>()

const rawAmount = ref('')
const title = ref('')
const paidBy = ref(props.currentUserId)
const tag = ref<ExpenseCategory>('food')
const splitMode = ref<'5050' | 'custom'>('5050')
const customPct = ref(50)

const displayAmount = computed(() => {
  if (!rawAmount.value) return '0,00'
  const n = parseFloat(rawAmount.value)
  return isNaN(n) ? '0,00' : n.toFixed(2).replace('.', ',')
})

const tags: Array<{ value: ExpenseCategory; label: string; color: string }> = [
  { value: 'food',      label: 'Lebensmittel', color: 'var(--accent)' },
  { value: 'transport', label: 'Auto',         color: 'var(--sarah)' },
  { value: 'home',      label: 'Haushalt',     color: '#a99ac2' },
  { value: 'leisure',   label: 'Essen',        color: '#c98a7e' },
  { value: 'other',     label: 'Sonstiges',    color: 'var(--chris)' },
]

const partnerUid = computed(() => {
  if (!props.couple) return null
  return props.couple.memberIds.find(id => id !== props.currentUserId) ?? null
})

const partnerName = computed(() => {
  if (!props.couple || !partnerUid.value) return 'Partner'
  return props.couple.memberNames[partnerUid.value] || 'Partner'
})

const myName = computed(() => {
  if (!props.couple) return 'Ich'
  return props.couple.memberNames[props.currentUserId] || 'Ich'
})

function personColor(uid: string) {
  if (!props.couple) return 'var(--text-faint)'
  return props.couple.memberIds.indexOf(uid) === 0 ? 'var(--chris)' : 'var(--sarah)'
}

function personTint(uid: string) {
  if (!props.couple) return 'transparent'
  return props.couple.memberIds.indexOf(uid) === 0 ? 'var(--chris-tint)' : 'var(--sarah-tint)'
}

function handleSubmit() {
  const amountCents = Math.round((parseFloat(rawAmount.value) || 0) * 100)
  if (amountCents <= 0 || !title.value.trim()) return

  const partner = partnerUid.value
  let owedBy: Record<string, number> = {}

  if (partner) {
    if (splitMode.value === '5050') {
      const half = Math.round(amountCents / 2)
      owedBy[props.currentUserId] = half
      owedBy[partner] = amountCents - half
    } else {
      const myAmt = Math.round(amountCents * customPct.value / 100)
      owedBy[props.currentUserId] = myAmt
      owedBy[partner] = amountCents - myAmt
    }
  } else {
    owedBy[props.currentUserId] = amountCents
  }

  emit('submit', {
    title: title.value.trim(),
    amountInCents: amountCents,
    paidBy: paidBy.value,
    owedBy,
    category: tag.value,
  })

  rawAmount.value = ''
  title.value = ''
  paidBy.value = props.currentUserId
  tag.value = 'food'
  splitMode.value = '5050'
  customPct.value = 50
}
</script>

<template>
  <BottomSheet :isOpen="isOpen" @close="$emit('close')">
    <!-- Amount display -->
    <div class="amount-display">
      <span class="amount-value mono">{{ displayAmount }}</span>
      <span class="amount-currency">€</span>
    </div>

    <!-- Title input -->
    <input
      v-model="title"
      class="app-field title-field"
      type="text"
      placeholder="Titel · z. B. REWE Wocheneinkauf"
    />

    <!-- Payer toggle -->
    <div class="section-label row-label">Bezahlt von</div>
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
        {{ myName }}
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
        {{ partnerName }}
      </button>
    </div>

    <!-- Tag chips -->
    <div class="section-label row-label">Kategorie</div>
    <div class="tags-row">
      <button
        v-for="t in tags"
        :key="t.value"
        class="tag-chip"
        :class="{ 'tag-chip--active': tag === t.value }"
        :style="tag === t.value ? {
          background: t.color + '28',
          borderColor: t.color,
          color: t.color
        } : {}"
        @click="tag = t.value"
      >
        {{ t.label }}
      </button>
    </div>

    <!-- Split toggle -->
    <div class="section-label row-label">Aufteilung</div>
    <div class="split-row">
      <button
        class="split-btn"
        :class="{ 'split-btn--active': splitMode === '5050' }"
        @click="splitMode = '5050'"
      >50/50</button>
      <button
        class="split-btn"
        :class="{ 'split-btn--active': splitMode === 'custom' }"
        @click="splitMode = 'custom'"
      >Individuell</button>
    </div>
    <div v-if="splitMode === 'custom'" class="custom-split">
      <div class="split-labels">
        <span>{{ myName }} {{ customPct }}%</span>
        <span>{{ partnerName }} {{ 100 - customPct }}%</span>
      </div>
      <input
        v-model.number="customPct"
        type="range"
        min="0"
        max="100"
        step="5"
        class="split-slider"
      />
    </div>

    <!-- Keypad -->
    <NumericKeypad v-model="rawAmount" class="keypad-wrap" />

    <!-- Submit -->
    <button
      class="btn-primary submit-btn"
      :disabled="!rawAmount || parseFloat(rawAmount) <= 0 || !title.trim()"
      @click="handleSubmit"
    >
      Hinzufügen
    </button>
  </BottomSheet>
</template>

<style scoped>
.amount-display {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 6px;
  margin-bottom: 20px;
}

.amount-value {
  font-size: 40px;
  font-weight: 600;
  color: var(--text);
  line-height: 1;
}

.amount-currency {
  font-family: 'Geist Mono', monospace;
  font-size: 24px;
  color: var(--text-meta);
}

.title-field {
  margin-bottom: 20px;
}

.row-label {
  margin-bottom: 8px;
}

.payer-row {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
}

.payer-btn {
  flex: 1;
  padding: 10px;
  background: var(--surface-deep);
  border: 1px solid var(--border-soft);
  border-radius: 10px;
  color: var(--text-meta);
  font-family: 'Hanken Grotesk', system-ui, sans-serif;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.payer-btn--active {
  color: var(--text);
}

.tags-row {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  margin-bottom: 20px;
  padding-bottom: 2px;
}

.tag-chip {
  padding: 7px 14px;
  background: var(--surface-deep);
  border: 1px solid var(--border-soft);
  border-radius: 100px;
  color: var(--text-meta);
  font-family: 'Hanken Grotesk', system-ui, sans-serif;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s ease;
  flex-shrink: 0;
}

.split-row {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.split-btn {
  flex: 1;
  padding: 10px;
  background: var(--surface-deep);
  border: 1px solid var(--border-soft);
  border-radius: 10px;
  color: var(--text-meta);
  font-family: 'Hanken Grotesk', system-ui, sans-serif;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.split-btn--active {
  background: var(--accent-tint);
  border-color: var(--accent);
  color: var(--accent);
}

.custom-split {
  margin-bottom: 16px;
}

.split-labels {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: var(--text-meta);
  margin-bottom: 8px;
}

.split-slider {
  width: 100%;
  accent-color: var(--accent);
}

.keypad-wrap {
  margin-bottom: 16px;
}

.submit-btn {
  margin-bottom: 8px;
}
</style>

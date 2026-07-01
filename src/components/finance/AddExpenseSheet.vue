<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { Couple } from '@/types'
import type { ExpenseCategory } from '@/types'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import NumericKeypad from './NumericKeypad.vue'

const props = defineProps<{
  isOpen: boolean
  couple: Couple | null
  currentUserId: string
  addContext?: 'dashboard' | 'event'
  startInEventMode?: boolean
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
  submitEvent: [payload: { title: string; dateLabel: string }]
}>()

const addMode = ref<'expense' | 'event'>('expense')
const newEventTitle = ref('')
const newEventDate = ref('')

const showModeToggle = computed(() => (props.addContext ?? 'dashboard') === 'dashboard')

const sheetTitle = computed(() => addMode.value === 'event' ? 'Neues Finanzevent' : 'Ausgabe hinzufügen')

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

function handleSubmitEvent() {
  const cleanTitle = newEventTitle.value.trim()
  if (!cleanTitle) return

  emit('submitEvent', {
    title: cleanTitle,
    dateLabel: newEventDate.value.trim()
  })

  newEventTitle.value = ''
  newEventDate.value = ''
}

watch(() => props.isOpen, (open) => {
  if (!open) return
  addMode.value = props.startInEventMode ? 'event' : 'expense'
})
</script>

<template>
  <BottomSheet :isOpen="isOpen" :title="sheetTitle" @close="$emit('close')">
    <!-- Ausgabe / Neues Event toggle -->
    <div v-if="showModeToggle" class="mode-toggle">
      <button
        class="mode-btn"
        :class="{ 'mode-btn--active': addMode === 'expense' }"
        @click="addMode = 'expense'"
      >Ausgabe</button>
      <button
        class="mode-btn"
        :class="{ 'mode-btn--active': addMode === 'event' }"
        @click="addMode = 'event'"
      >Neues Event</button>
    </div>

    <!-- Event mode form -->
    <template v-if="addMode === 'event'">
      <p class="event-hint">
        Für größere Anschaffungen oder Reisen — sammle mehrere Ausgaben an einem Ort und gleicht am Ende gemeinsam aus.
      </p>
      <input
        v-model="newEventTitle"
        class="app-field"
        type="text"
        placeholder="Name · z. B. Urlaub Portugal"
        style="margin-bottom: 10px"
      />
      <input
        v-model="newEventDate"
        class="app-field"
        type="text"
        placeholder="Zeitraum · optional, z. B. 12.–18. Juli"
        style="margin-bottom: 14px"
      />
      <button class="btn-primary submit-btn" :disabled="!newEventTitle.trim()" @click="handleSubmitEvent">
        Event anlegen
      </button>
    </template>

    <!-- Expense mode form -->
    <template v-else>
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
    </template>
  </BottomSheet>
</template>

<style scoped>
.mode-toggle {
  display: flex;
  background: var(--surface-deep);
  border: 1px solid var(--border-softer);
  border-radius: 13px;
  padding: 4px;
  margin-bottom: 18px;
}

.mode-btn {
  flex: 1;
  border: none;
  font-family: 'Hanken Grotesk', system-ui, sans-serif;
  font-size: 13.5px;
  font-weight: 600;
  padding: 11px 0;
  border-radius: 10px;
  background: transparent;
  color: var(--text-meta);
  cursor: pointer;
}

.mode-btn--active {
  background: var(--accent);
  color: #15110d;
}

.event-hint {
  font-size: 12.5px;
  color: var(--text-meta);
  line-height: 1.5;
  margin: 0 0 16px;
}

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

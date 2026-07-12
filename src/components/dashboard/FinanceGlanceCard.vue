<script setup lang="ts">
import { computed } from 'vue'
import type { Couple } from '@/types'
import { useMountFlag, useCountUp } from '@/composables/useMountAnim'
import InitialChip from '@/components/ui/InitialChip.vue'

const props = defineProps<{
  couple: Couple | null
  monthLabel: string
  spent: number // Cent — alle Ausgaben des laufenden Monats (auch beglichene)
  budget: number | null // Cent
  paid: Record<string, number> // Cent je uid — wer hat den Monat ausgelegt (alle Ausgaben)
  // Cent je uid — Ausgleich zwischen den Partnern; hängt NICHT an den obigen
  // Monatszahlen und läuft über alle noch offenen Ausgaben, auch ältere.
  balances: Record<string, number>
  last: { by: string; title: string; amount: number } | null
}>()

const emit = defineEmits<{
  (e: 'open'): void
  (e: 'settle'): void
  (e: 'setBudget'): void
}>()

const run = useMountFlag(120)

const hasBudget = computed(() => props.budget != null && props.budget > 0)

// Beträge liegen als Cent vor; Nachkommastellen nur zeigen, wenn es welche gibt.
function eur(cents: number): string {
  const value = cents / 100
  return value.toLocaleString('de-DE', {
    minimumFractionDigits: value % 1 ? 2 : 0,
    maximumFractionDigits: 2,
  })
}

// ── Ring: Budget-Auslastung ───────────────────────────────────────
const R = 46
const CIRC = 2 * Math.PI * R

const spentPct = computed(() => (hasBudget.value ? props.spent / props.budget! : 0))
const danger = computed(() => hasBudget.value && spentPct.value > 0.9)

// Ohne Budget zeigt der Ring keinen Fortschritt, die Mitte dafür das
// Ausgegebene — die Karte bleibt eine Auskunft, keine Aufforderung.
const remain = computed(() => (props.budget ?? 0) - props.spent)
const centerValue = computed(() => (hasBudget.value ? remain.value : props.spent))
const centerAnim = useCountUp(centerValue, run, 1000)

const dashOffset = computed(() =>
  CIRC * (1 - (run.value ? Math.min(1, Math.max(0, spentPct.value)) : 0))
)

// Tempo: verbrauchter Anteil des Budgets gegen den verstrichenen Anteil des
// Monats. Nur ein deutliches Vorauseilen (> 5 %) ist eine Warnung wert.
const overPct = computed(() => {
  const now = new Date()
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const monthPct = now.getDate() / daysInMonth
  return Math.round((spentPct.value - monthPct) * 100)
})

const overBudgetPace = computed(() => overPct.value > 5)

// ── Paar-Split ────────────────────────────────────────────────────
const members = computed(() => props.couple?.memberIds ?? [])

const paidA = computed(() => props.paid[members.value[0]] ?? 0)
const paidB = computed(() => props.paid[members.value[1]] ?? 0)
const paidAAnim = useCountUp(paidA, run, 900)
const paidBAnim = useCountUp(paidB, run, 900)

const shareA = computed(() => {
  const total = paidA.value + paidB.value
  return total ? paidA.value / total : 0.5
})

function personColor(uid: string): string {
  return members.value.indexOf(uid) === 0 ? 'var(--chris)' : 'var(--sarah)'
}

function personName(uid: string): string {
  return props.couple?.memberNames[uid] ?? '?'
}

// Saldo: wer noch was von wem bekommt. In einem Paar ist balances[a] das
// Negativ von balances[b] — ein Vorzeichen genügt.
const debt = computed(() => {
  const [a, b] = members.value
  if (!a || !b) return null
  const balA = props.balances[a] ?? 0
  if (Math.abs(balA) < 1) return null
  return {
    from: balA > 0 ? b : a,
    to: balA > 0 ? a : b,
    amount: Math.abs(balA),
  }
})

const debtAmount = computed(() => debt.value?.amount ?? 0)
const debtAnim = useCountUp(debtAmount, run, 700)
</script>

<template>
  <div class="fin-card" @click="emit('open')">
    <div class="fin-top">
      <div class="budget-ring">
        <svg viewBox="0 0 108 108" class="ring-svg">
          <circle cx="54" cy="54" :r="R" fill="none" stroke="var(--surface)" stroke-width="11" />
          <circle
            v-if="hasBudget"
            cx="54"
            cy="54"
            :r="R"
            fill="none"
            :stroke="danger ? 'var(--danger)' : 'var(--finanzen)'"
            stroke-width="11"
            stroke-linecap="round"
            :stroke-dasharray="CIRC"
            :stroke-dashoffset="dashOffset"
            class="ring-progress"
          />
        </svg>
        <div class="ring-center">
          <span class="ring-kicker">{{ hasBudget ? 'noch' : 'ausgegeben' }}</span>
          <span class="ring-value mono" :style="{ color: danger ? 'var(--danger)' : 'var(--text)' }">
            {{ Math.round(centerAnim / 100) }} €
          </span>
        </div>
      </div>

      <div class="fin-meta">
        <div class="fin-title-row">
          <span class="fin-title">Finanzen</span>
          <span class="fin-month">· {{ monthLabel }}</span>
        </div>
        <span v-if="hasBudget" class="fin-amounts mono">{{ eur(spent) }} € / {{ eur(budget!) }} €</span>
        <span v-else class="fin-amounts mono">{{ eur(spent) }} € diesen Monat</span>

        <div class="pace-row">
          <span v-if="hasBudget" class="pace" :class="overBudgetPace ? 'pace--over' : 'pace--ok'">
            {{ overBudgetPace ? `▲ ${overPct} % über Tempo` : 'im Plan' }}
          </span>
          <button v-else class="budget-chip" type="button" @click.stop="emit('setBudget')">
            ＋ Budget festlegen
          </button>
        </div>

        <div v-if="last" class="last-row">
          <InitialChip :uid="last.by" :couple="couple" :size="18" />
          <span class="last-text">
            zuletzt · {{ last.title }} <b class="mono">{{ eur(last.amount) }} €</b>
          </span>
        </div>
      </div>
    </div>

    <div class="split">
      <div class="split-persons">
        <div v-for="(uid, i) in members" :key="uid" class="split-person">
          <div class="split-head">
            <InitialChip :uid="uid" :couple="couple" :size="17" />
            <span class="split-name">{{ personName(uid) }}</span>
            <span class="split-amount mono" :style="{ color: personColor(uid) }">
              {{ eur(Math.round(i === 0 ? paidAAnim : paidBAnim)) }} €
            </span>
          </div>
          <div class="split-track">
            <div
              class="split-fill"
              :style="{
                width: (run ? (i === 0 ? shareA : 1 - shareA) * 100 : 0) + '%',
                background: personColor(uid),
                marginLeft: i === 1 ? 'auto' : '0',
              }"
            />
          </div>
        </div>
      </div>

      <div v-if="debt" class="debt">
        <span class="debt-icon">⚖️</span>
        <span class="debt-text">
          {{ personName(debt.from) }} schuldet {{ personName(debt.to) }}
          <span class="mono" :style="{ color: personColor(debt.to) }">{{ eur(Math.round(debtAnim)) }} €</span>
        </span>
        <button class="debt-btn" type="button" @click.stop="emit('settle')">Ausgleichen</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Ohne Budget steht hier statt der Tempo-Pille die Einladung, eins zu setzen —
   die Zahlen der Karte (Split, Saldo, letzte Zahlung) hängen nicht daran. */
.budget-chip {
  padding: 4px 10px;
  border: 1px dashed var(--finanzen);
  border-radius: 999px;
  background: var(--surface);
  color: var(--finanzen);
  font-family: var(--font-body);
  font-size: 11px;
  font-weight: 800;
  cursor: pointer;
  white-space: nowrap;
}

.fin-card {
  background: var(--finanzen-tint);
  border: 1px solid var(--border-softer);
  border-radius: var(--radius-card);
  padding: 15px;
  cursor: pointer;
}

.fin-top {
  display: flex;
  align-items: center;
  gap: 14px;
}

.budget-ring {
  position: relative;
  width: 100px;
  height: 100px;
  flex-shrink: 0;
}

.ring-svg {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.ring-progress {
  transition: stroke-dashoffset 1.1s var(--ease-standard);
}

.ring-center {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.ring-kicker {
  font-size: 9.5px;
  font-weight: 800;
  text-transform: uppercase;
  color: var(--text-meta);
}

.ring-value {
  font-size: 20px;
  line-height: 1;
}

.fin-meta {
  flex: 1;
  min-width: 0;
}

.fin-title-row {
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.fin-title {
  font-family: var(--font-headline);
  font-size: 15px;
  font-weight: 700;
  color: var(--text);
}

.fin-month {
  font-size: 12px;
  font-weight: 700;
  color: var(--text-meta);
}

.fin-amounts {
  font-size: 13px;
  color: var(--text-secondary);
}

.pace-row {
  margin-top: 6px;
}

.pace {
  display: inline-block;
  padding: 3px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 800;
  white-space: nowrap;
}

.pace--ok {
  color: var(--success);
  background: var(--success-tint);
}

.pace--over {
  color: var(--danger);
  background: var(--danger-tint);
}

.last-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 9px;
  min-width: 0;
}

.last-text {
  font-size: 11.5px;
  font-weight: 700;
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.split {
  margin-top: 13px;
  padding-top: 13px;
  border-top: 1px solid var(--border-softer);
}

.split-persons {
  display: flex;
  gap: 12px;
  margin-bottom: 9px;
}

.split-person {
  flex: 1;
  min-width: 0;
}

.split-head {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-bottom: 4px;
}

.split-name {
  font-size: 11.5px;
  font-weight: 800;
  color: var(--text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.split-amount {
  margin-left: auto;
  font-size: 12px;
  white-space: nowrap;
}

.split-track {
  height: 6px;
  border-radius: 999px;
  background: var(--surface);
  overflow: hidden;
}

.split-fill {
  height: 100%;
  border-radius: 999px;
  transition: width 0.9s var(--ease-standard);
}

.debt {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 9px 11px;
  background: var(--surface);
  border-radius: 12px;
}

.debt-icon {
  font-size: 15px;
}

.debt-text {
  flex: 1;
  min-width: 0;
  font-size: 12.5px;
  font-weight: 800;
  color: var(--text-secondary);
}

.debt-btn {
  flex-shrink: 0;
  padding: 7px 12px;
  border: none;
  border-radius: 10px;
  background: var(--finanzen);
  color: #fff;
  font-family: var(--font-body);
  font-size: 11.5px;
  font-weight: 800;
  cursor: pointer;
}
</style>

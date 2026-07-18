<script setup lang="ts">
import { computed } from 'vue'
import type { Couple } from '@/types'
import { useMountFlag } from '@/composables/useMountAnim'
import { partnerId } from '@/utils/belegung'

const props = defineProps<{
  couple: Couple | null
  currentUserId: string
  monthLabel: string
  spent: number // Cent — alle Ausgaben des laufenden Monats
  budget: number | null // Cent
  balances: Record<string, number> // Cent je uid — offener Paar-Saldo (nur unbezahlt)
}>()

const emit = defineEmits<{
  (e: 'open'): void
  (e: 'addExpense'): void
}>()

const run = useMountFlag(120)

const hasBudget = computed(() => props.budget != null && props.budget > 0)

function eur(cents: number): string {
  const value = Math.abs(cents) / 100
  return value.toLocaleString('de-DE', {
    minimumFractionDigits: value % 1 ? 2 : 0,
    maximumFractionDigits: 2,
  })
}

// ── Budget ─────────────────────────────────────────────────────────
const pct = computed(() => (hasBudget.value ? Math.round((props.spent / props.budget!) * 100) : 0))
const barWidth = computed(() => Math.min(100, Math.max(0, pct.value)))
const remain = computed(() => (props.budget ?? 0) - props.spent)
const over = computed(() => hasBudget.value && props.spent > props.budget!)

// ── Paar-Ausgleich ─────────────────────────────────────────────────
const partner = computed(() => partnerId(props.couple, props.currentUserId))
const partnerName = computed(() =>
  partner.value ? props.couple?.memberNames[partner.value] ?? 'Partner' : 'Partner'
)

const myBalance = computed(() => props.balances[props.currentUserId] ?? 0)
const balanceAmount = computed(() => Math.abs(myBalance.value))
const hasOpen = computed(() => balanceAmount.value > 0)

// Wortlaut des Ausgleichs — positiv: der Partner schuldet mir, negativ: ich ihm.
const debtLabel = computed(() =>
  myBalance.value >= 0 ? `${partnerName.value} schuldet dir` : `Du schuldest ${partnerName.value}`
)
</script>

<template>
  <div class="fin" @click="emit('open')">
    <!-- Budget gesetzt -->
    <template v-if="hasBudget">
      <div class="fin-headrow">
        <span class="fin-lab">Budget {{ monthLabel }}</span>
        <span class="fin-badge" :class="{ 'fin-badge--over': over }">{{ pct }} %</span>
      </div>
      <div class="fin-amountrow">
        <span class="fin-amt mono">{{ eur(spent) }} €</span>
        <span class="fin-sub">
          von {{ eur(budget!) }} € ·
          <template v-if="remain >= 0">noch {{ eur(remain) }} €</template>
          <template v-else>{{ eur(remain) }} € drüber</template>
        </span>
      </div>
      <div class="prog">
        <i :style="{ width: (run ? barWidth : 0) + '%', background: over ? 'var(--danger)' : 'var(--finanzen)' }" />
      </div>
      <div v-if="hasOpen" class="fin-line">
        ⚖️ {{ debtLabel }} <b class="mono">{{ eur(balanceAmount) }} €</b>
      </div>
    </template>

    <!-- Kein Budget — schlanker Ausgleich (nur bei offener Summe gerendert) -->
    <template v-else>
      <span class="fin-lab">Ausgleich</span>
      <div class="fin-amt mono fin-amt--balance">{{ eur(balanceAmount) }} €</div>
      <div class="fin-sub">{{ debtLabel }}</div>
    </template>

    <button class="fin-add" type="button" @click.stop="emit('addExpense')">＋ Ausgabe erfassen</button>
  </div>
</template>

<style scoped>
.fin {
  background: linear-gradient(
    160deg,
    color-mix(in srgb, var(--finanzen) 15%, var(--surface)),
    color-mix(in srgb, var(--finanzen) 6%, var(--surface))
  );
  border: 1px solid color-mix(in srgb, var(--finanzen) 24%, transparent);
  border-radius: var(--radius-card);
  padding: 17px;
  box-shadow: var(--shadow-card);
  cursor: pointer;
}

.fin-lab {
  font-size: 11.5px;
  font-weight: 800;
  letter-spacing: 0.7px;
  text-transform: uppercase;
  color: var(--finanzen);
}

.fin-headrow {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.fin-badge {
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12.5px;
  font-weight: 800;
  color: var(--finanzen);
  background: color-mix(in srgb, var(--finanzen) 16%, var(--surface));
}

.fin-badge--over {
  color: var(--danger);
  background: var(--danger-tint);
}

.fin-amountrow {
  display: flex;
  align-items: flex-end;
  gap: 9px;
  margin-top: 9px;
}

.fin-amt {
  font-size: 29px;
  letter-spacing: -0.5px;
  line-height: 1;
  color: var(--finanzen);
}

.fin-amt--balance {
  margin-top: 8px;
}

.fin-sub {
  font-size: 13.5px;
  font-weight: 700;
  color: var(--text-secondary);
  margin-bottom: 2px;
}

.prog {
  height: 10px;
  border-radius: 6px;
  background: color-mix(in srgb, var(--finanzen) 12%, var(--surface));
  overflow: hidden;
  margin-top: 13px;
}

.prog i {
  display: block;
  height: 100%;
  border-radius: 6px;
  transition: width 0.9s var(--ease-standard);
}

.fin-line {
  font-size: 13.5px;
  font-weight: 700;
  color: var(--text-secondary);
  margin-top: 13px;
}

.fin-line b {
  color: var(--text);
}

.fin-add {
  width: 100%;
  margin-top: 15px;
  min-height: 46px;
  border: none;
  border-radius: 14px;
  background: color-mix(in srgb, var(--finanzen) 13%, var(--surface));
  color: var(--finanzen);
  font-family: var(--font-body);
  font-weight: 800;
  font-size: 14.5px;
  cursor: pointer;
  transition: transform 0.12s var(--ease-overshoot);
}

.fin-add:active {
  transform: scale(0.97);
}
</style>

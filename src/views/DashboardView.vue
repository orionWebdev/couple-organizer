<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { useCouple } from '@/composables/useCouple'
import { useChores } from '@/composables/useChores'
import { useShopping } from '@/composables/useShopping'
import { useMealPlan } from '@/composables/useMealPlan'
import { useExpenses } from '@/composables/useExpenses'
import { showToast } from '@/composables/useToast'
import { isDoneToday, personName, personVisual } from '@/utils/chores'
import { roomOf, roomLabel } from '@/utils/rooms'
import { primaryTagMeta } from '@/utils/recipeTags'
import { dateKey } from '@/utils/mealplan'
import InitialChip from '@/components/ui/InitialChip.vue'
import BottomSheet from '@/components/ui/BottomSheet.vue'

const router = useRouter()
const { user } = useAuth()
const { couple, updateBudget } = useCouple()
const coupleId = computed(() => user.value?.coupleId ?? null)

const { chores, loading: choresLoading, completeChore } = useChores(coupleId)
const { items, loading: shoppingLoading, toggleChecked } = useShopping(coupleId)
const { week, loading: mealPlanLoading, setCookAssignee } = useMealPlan(coupleId)
const { monthlySummaries, balanceInfo, loading: expensesLoading } = useExpenses(coupleId)

const loading = computed(() =>
  choresLoading.value || shoppingLoading.value || mealPlanLoading.value || expensesLoading.value
)

const dateLabel = computed(() =>
  new Intl.DateTimeFormat('de-DE', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())
)

// ── Essensplan heute ──────────────────────────────────────────
const todayEntry = computed(() => {
  const key = dateKey(new Date())
  return week.value.find((d) => d.dateKey === key) ?? null
})

const todayIcon = computed(() =>
  todayEntry.value?.recipe ? primaryTagMeta(todayEntry.value.recipe.tags) : null
)

function cookChipStyle(active: boolean, color: string) {
  return {
    background: active ? color : 'var(--surface)',
    color: active ? '#fff' : 'var(--text-secondary)',
    borderColor: active ? color : 'var(--border-softer)',
  }
}

async function setCook(assignee: string | 'both') {
  if (!todayEntry.value?.entry) return
  const ok = await setCookAssignee(todayEntry.value.entry.id, assignee)
  if (!ok) showToast('Fehler beim Speichern')
}

function goToEssensplan() {
  router.push('/einkaufen')
}

// ── Einkauf ───────────────────────────────────────────────────
const nextShopItems = computed(() => items.value.filter((i) => !i.checked).slice(0, 3))

async function toggleShopItem(id: string) {
  await toggleChecked(id, true, user.value?.uid)
}

// ── Haushalt ──────────────────────────────────────────────────
const nextChore = computed(() => chores.value.find((c) => !isDoneToday(c)) ?? null)

const nextChoreSub = computed(() => {
  const c = nextChore.value
  if (!c) return ''
  return `${personName(c.assignee, couple.value)} · ${roomLabel(roomOf(c))}`
})

async function completeNextChore() {
  const c = nextChore.value
  if (!c) return
  const ok = await completeChore(c, c.assignee ?? 'both')
  showToast(ok ? 'Erledigt!' : 'Fehler beim Speichern')
}

// ── Finanzen ──────────────────────────────────────────────────
function currentMonthKey(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

const currentMonthSpent = computed(() =>
  monthlySummaries.value.find((m) => m.monthKey === currentMonthKey())?.total ?? 0
)

const monthLabel = computed(() =>
  new Intl.DateTimeFormat('de-DE', { month: 'long' }).format(new Date())
)

function formatEuros(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',') + ' €'
}

const budgetCents = computed(() => couple.value?.monthlyBudget ?? null)

const budgetPct = computed(() => {
  if (!budgetCents.value) return 0
  return Math.min(100, Math.round((currentMonthSpent.value / budgetCents.value) * 100))
})

const debtHint = computed(() => {
  const ids = couple.value?.memberIds ?? []
  if (ids.length < 2) return null
  const [a, b] = ids
  const balA = balanceInfo.value.balances[a] ?? 0
  if (Math.abs(balA) < 1) return null
  const creditor = balA > 0 ? a : b
  const debtor = balA > 0 ? b : a
  return `${personName(creditor, couple.value)} bekommt noch ${formatEuros(Math.abs(balA))} von ${personName(debtor, couple.value)}`
})

// ── Budget festlegen (neu, nur hier editierbar) ───────────────
const showBudgetSheet = ref(false)
const budgetInput = ref('')

function openBudgetSheet() {
  budgetInput.value = budgetCents.value ? (budgetCents.value / 100).toFixed(2) : ''
  showBudgetSheet.value = true
}

async function saveBudget() {
  const euros = parseFloat(budgetInput.value.replace(',', '.'))
  const ok = await updateBudget(isNaN(euros) || euros <= 0 ? null : Math.round(euros * 100))
  showToast(ok ? 'Budget gespeichert' : 'Fehler beim Speichern')
  if (ok) showBudgetSheet.value = false
}
</script>

<template>
  <div class="dashboard-page area-dashboard">
    <div class="page-header">
      <div>
        <h1 class="greeting">Moin, ihr zwei 👋</h1>
        <span class="date-label">{{ dateLabel }}</span>
      </div>
      <div class="avatar-stack">
        <InitialChip
          v-for="uid in couple?.memberIds ?? []"
          :key="uid"
          :uid="uid"
          :couple="couple"
          :size="34"
        />
      </div>
    </div>

    <div v-if="loading" class="loading-msg">Laden…</div>
    <div v-else class="bento-grid">
      <!-- Essensplan heute -->
      <div class="bento-card bento-card--wide meal-card">
        <template v-if="todayEntry?.recipe">
          <div class="meal-top">
            <span class="meal-icon" :style="{ background: todayIcon?.color }">{{ todayIcon?.emoji }}</span>
            <div class="meal-text">
              <span class="meal-label">Heute Abend</span>
              <span class="meal-title">{{ todayEntry.recipe.title }}</span>
            </div>
            <span v-if="todayEntry.recipe.minutes" class="meal-time">{{ todayEntry.recipe.minutes }} Min</span>
          </div>
          <div class="cook-row">
            <span class="cook-label">Wer kocht?</span>
            <button
              v-for="uid in couple?.memberIds ?? []"
              :key="uid"
              type="button"
              class="cook-chip"
              :style="cookChipStyle(todayEntry.entry?.cookAssignee === uid, personVisual(uid, couple).color)"
              @click="setCook(uid)"
            >{{ (couple?.memberNames[uid] ?? '?').charAt(0).toUpperCase() }}</button>
            <button
              type="button"
              class="cook-chip cook-chip--both"
              :style="cookChipStyle(todayEntry.entry?.cookAssignee === 'both', 'var(--food)')"
              @click="setCook('both')"
            >Beide</button>
          </div>
        </template>
        <template v-else>
          <div class="meal-empty">
            <span class="meal-empty-text">Heute ist noch nichts geplant.</span>
            <button class="meal-empty-link" type="button" @click="goToEssensplan">Essensplan öffnen ›</button>
          </div>
        </template>
      </div>

      <!-- Einkauf -->
      <div class="bento-card shop-card">
        <div class="card-head">
          <span class="card-head-icon">🛒</span>
          <span class="card-head-title">Einkauf</span>
        </div>
        <div v-if="nextShopItems.length === 0" class="card-empty">Nichts Offenes 🎉</div>
        <div v-else class="shop-list">
          <div v-for="item in nextShopItems" :key="item.id" class="shop-row">
            <button class="shop-box" type="button" @click="toggleShopItem(item.id)" />
            <span class="shop-name">{{ item.name }}</span>
          </div>
        </div>
        <button class="card-link" type="button" @click="goToEssensplan">Zum Einkaufszettel ›</button>
      </div>

      <!-- Haushalt -->
      <div class="bento-card chore-card">
        <div class="card-head">
          <span class="card-head-icon">🧽</span>
          <span class="card-head-title">Haushalt</span>
        </div>
        <template v-if="nextChore">
          <div class="chore-name">{{ nextChore.name }}</div>
          <div class="chore-sub">{{ nextChoreSub }}</div>
          <button class="chore-btn" type="button" @click="completeNextChore">✓ Erledigt</button>
        </template>
        <div v-else class="card-empty">Alles erledigt ✓</div>
      </div>

      <!-- Finanzen -->
      <div class="bento-card bento-card--wide finance-card">
        <div class="finance-head">
          <span class="finance-title">Finanzen · {{ monthLabel }}</span>
          <button v-if="!budgetCents" class="budget-set-link" type="button" @click="openBudgetSheet">
            {{ formatEuros(currentMonthSpent) }} · Budget festlegen
          </button>
          <span v-else class="finance-amount mono" @click="openBudgetSheet">
            {{ formatEuros(currentMonthSpent) }} / {{ formatEuros(budgetCents) }}
          </span>
        </div>
        <div v-if="budgetCents" class="budget-bar">
          <div class="budget-fill" :style="{ width: budgetPct + '%' }" />
        </div>
        <div v-if="debtHint" class="debt-hint">{{ debtHint }}</div>
      </div>
    </div>

    <BottomSheet :isOpen="showBudgetSheet" title="Monatsbudget festlegen" @close="showBudgetSheet = false">
      <input
        v-model="budgetInput"
        class="app-field"
        type="number"
        inputmode="decimal"
        placeholder="z. B. 800"
        @keyup.enter="saveBudget"
      />
      <button class="btn-primary" @click="saveBudget">Speichern</button>
    </BottomSheet>
  </div>
</template>

<style scoped>
.dashboard-page {
  min-height: 100%;
  padding-bottom: 24px;
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: calc(var(--safe-top) + 20px) var(--screen-pad) 8px;
}

.greeting {
  font-family: var(--font-headline);
  font-size: 21px;
  font-weight: 700;
  color: var(--text);
  margin: 0;
}

.date-label {
  display: block;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--text-secondary);
  margin-top: 2px;
}

.avatar-stack {
  display: flex;
}

.avatar-stack :deep(*:not(:first-child)) {
  margin-left: -12px;
}

.loading-msg {
  padding: 40px var(--screen-pad);
  font-size: 14px;
  color: var(--text-faint);
  text-align: center;
}

.bento-grid {
  padding: 14px var(--screen-pad) 24px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.bento-card {
  border-radius: var(--radius-card-lg);
  padding: 13px;
  border: 1px solid rgba(255, 255, 255, 0.55);
}

.bento-card--wide {
  grid-column: span 2;
  padding: 15px 16px;
}

/* Essensplan heute */
.meal-card {
  background: var(--food-tint);
}

.meal-top {
  display: flex;
  align-items: center;
  gap: 12px;
}

.meal-icon {
  flex-shrink: 0;
  width: 44px;
  height: 44px;
  border-radius: 15px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 21px;
  box-shadow: 0 5px 12px rgba(60, 45, 30, 0.15);
}

.meal-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.meal-label {
  font-size: 11px;
  font-weight: 600;
  color: #9a8272;
}

.meal-title {
  font-family: var(--font-headline);
  font-size: 15.5px;
  font-weight: 700;
  color: var(--text);
  margin-top: 1px;
}

.meal-time {
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 700;
  color: var(--food);
}

.cook-row {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid rgba(120, 90, 70, 0.14);
  display: flex;
  align-items: center;
  gap: 8px;
}

.cook-label {
  font-size: 11px;
  font-weight: 600;
  color: #9a8272;
  margin-right: 2px;
  flex-shrink: 0;
}

.cook-chip {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  border: 1.5px solid var(--border-softer);
  font-family: var(--font-body);
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.15s;
}

.cook-chip--both {
  width: auto;
  padding: 0 10px;
  border-radius: 20px;
}

.meal-empty {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
}

.meal-empty-text {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
}

.meal-empty-link {
  background: none;
  border: none;
  padding: 0;
  color: var(--food);
  font-family: var(--font-body);
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;
}

/* Einkauf / Haushalt Karten */
.shop-card {
  background: var(--einkauf-tint);
}

.chore-card {
  background: var(--haushalt-tint);
}

.card-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 9px;
}

.card-head-icon {
  width: 30px;
  height: 30px;
  border-radius: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  flex-shrink: 0;
  background: var(--einkauf);
}

.chore-card .card-head-icon {
  background: var(--haushalt);
}

.card-head-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--text);
}

.card-empty {
  font-size: 12px;
  color: var(--text-meta);
}

.shop-list {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.shop-row {
  display: flex;
  align-items: center;
  gap: 7px;
}

.shop-box {
  width: 18px;
  height: 18px;
  border-radius: 6px;
  border: 2px solid var(--border);
  background: var(--surface);
  flex-shrink: 0;
  cursor: pointer;
  padding: 0;
}

.shop-name {
  font-size: 11.5px;
  font-weight: 600;
  color: var(--text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-link {
  display: block;
  margin-top: 10px;
  background: none;
  border: none;
  padding: 0;
  font-size: 11px;
  font-weight: 700;
  color: oklch(0.5 0.13 80);
  cursor: pointer;
}

.chore-name {
  font-family: var(--font-headline);
  font-size: 13px;
  font-weight: 700;
  color: var(--text);
}

.chore-sub {
  font-size: 10.5px;
  font-weight: 600;
  color: var(--text-meta);
  margin-top: 1px;
}

.chore-btn {
  width: 100%;
  margin-top: 10px;
  background: var(--haushalt);
  color: #fff;
  border: none;
  border-radius: 10px;
  padding: 7px;
  font-family: var(--font-body);
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
}

/* Finanzen */
.finance-card {
  background: var(--finanzen-tint);
}

.finance-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}

.finance-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--text);
}

.finance-amount {
  font-size: 15px;
  color: var(--text);
  cursor: pointer;
}

.budget-set-link {
  background: none;
  border: none;
  padding: 0;
  font-family: var(--font-body);
  font-size: 11.5px;
  font-weight: 700;
  color: var(--finanzen);
  cursor: pointer;
}

.budget-bar {
  height: 8px;
  border-radius: 5px;
  background: var(--surface);
  margin-top: 9px;
  overflow: hidden;
}

.budget-fill {
  height: 100%;
  background: var(--finanzen);
  border-radius: 5px;
  transition: width 0.4s var(--ease-standard);
}

.debt-hint {
  margin-top: 9px;
  font-size: 11.5px;
  font-weight: 600;
  color: #5f7876;
}
</style>

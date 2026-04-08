<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
  IonContent,
  IonFooter,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonSpinner
} from '@ionic/vue'
import { closeOutline, arrowBackOutline } from 'ionicons/icons'
import { useAuth } from '@/composables/useAuth'
import type { Couple, ShoppingItem } from '@/types'

const props = defineProps<{
  isOpen: boolean
  items: ShoppingItem[]
  listId: string
  listTitle: string
  couple: Couple | null
  addExpense: (input: {
    title: string
    amountInCents: number
    paidBy: string
    owedBy: Record<string, number>
    category: 'food'
    source: 'shopping'
    shoppingListId: string
    shoppingItemIds: string[]
  }) => Promise<string | null>
}>()

const emit = defineEmits<{
  close: []
  toggle: [id: string, checked: boolean, uid: string | undefined]
}>()

const { user } = useAuth()

type Step = 'list' | 'finish'
const step = ref<Step>('list')
const finishAmount = ref('')
const finishPaidBy = ref('')
const submitting = ref(false)
const finishError = ref('')

const uncheckedItems = computed(() => props.items.filter((i) => !i.checked))
const checkedItems = computed(() => props.items.filter((i) => i.checked))
const checkedWithoutExpense = computed(() => checkedItems.value.filter((i) => !i.expenseId))

// Group unchecked items by category, preserving order of first appearance
const CATEGORY_ORDER = ['Lebensmittel', 'Drogerie', 'Haushalt', 'Sonstiges']

const groupedUnchecked = computed(() => {
  const map = new Map<string, typeof uncheckedItems.value>()
  for (const item of uncheckedItems.value) {
    const cat = item.category || 'Sonstiges'
    if (!map.has(cat)) map.set(cat, [])
    map.get(cat)!.push(item)
  }
  // Sort categories: known ones first, then alphabetical for unknowns
  const sorted = [...map.keys()].sort((a, b) => {
    const ia = CATEGORY_ORDER.indexOf(a)
    const ib = CATEGORY_ORDER.indexOf(b)
    if (ia !== -1 && ib !== -1) return ia - ib
    if (ia !== -1) return -1
    if (ib !== -1) return 1
    return a.localeCompare(b, 'de')
  })
  return sorted.map((cat) => ({ category: cat, items: map.get(cat)! }))
})

watch(
  () => props.couple,
  (couple) => {
    if (couple && !finishPaidBy.value) {
      finishPaidBy.value = Object.keys(couple.memberNames)[0] || ''
    }
  },
  { immediate: true }
)

watch(
  () => props.isOpen,
  (open) => {
    if (open) {
      step.value = 'list'
      finishAmount.value = ''
      finishError.value = ''
    }
  }
)

function handleToggle(item: ShoppingItem) {
  emit('toggle', item.id, !item.checked, user.value?.uid)
}

function buildOwedBy(totalAmountInEuro: number): Record<string, number> {
  const members = Object.keys(props.couple?.memberNames ?? {})
  if (members.length === 0) return {}

  const totalInCents = Math.round(totalAmountInEuro * 100)
  const baseShare = Math.floor(totalInCents / members.length)
  const remainder = totalInCents % members.length

  const owedBy: Record<string, number> = {}
  members.forEach((uid, index) => {
    owedBy[uid] = baseShare + (index < remainder ? 1 : 0)
  })
  return owedBy
}

async function handleFinish() {
  finishError.value = ''
  const amount = Number(String(finishAmount.value).replace(',', '.'))

  if (!amount || amount <= 0) {
    finishError.value = 'Bitte einen gültigen Betrag eingeben.'
    return
  }
  if (!finishPaidBy.value) {
    finishError.value = 'Bitte auswählen, wer bezahlt hat.'
    return
  }
  if (checkedWithoutExpense.value.length === 0) {
    finishError.value = 'Keine abgehakten Artikel ohne Ausgabe vorhanden.'
    return
  }

  submitting.value = true
  try {
    const expenseId = await props.addExpense({
      title: `Einkauf – ${props.listTitle}`,
      amountInCents: Math.round(amount * 100),
      paidBy: finishPaidBy.value,
      owedBy: buildOwedBy(amount),
      category: 'food',
      source: 'shopping',
      shoppingListId: props.listId,
      shoppingItemIds: checkedWithoutExpense.value.map((i) => i.id)
    })

    if (expenseId) {
      emit('close')
    } else {
      finishError.value = 'Ausgabe konnte nicht angelegt werden.'
    }
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <ion-modal :is-open="isOpen" css-class="app-fullscreen-modal" @did-dismiss="emit('close')">

    <!-- ── STEP: Shopping List ──────────────────────────────────── -->
    <template v-if="step === 'list'">
      <ion-header>
        <ion-toolbar>
          <ion-buttons slot="start">
            <ion-button fill="clear" @click="emit('close')">
              <ion-icon :icon="closeOutline" slot="icon-only" />
            </ion-button>
          </ion-buttons>
          <ion-title>{{ listTitle }}</ion-title>
          <ion-buttons slot="end">
            <span
              class="pr-4 text-sm font-semibold tabular-nums"
              :class="checkedItems.length > 0 ? 'text-green-400' : 'text-slate-400'"
            >
              {{ checkedItems.length }}/{{ items.length }}
            </span>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>

      <ion-content :scroll-events="false">
        <div class="mode-body">

          <!-- Unchecked items grouped by category -->
          <template v-for="group in groupedUnchecked" :key="group.category">
            <div class="section-divider">{{ group.category }}</div>
            <button
              v-for="item in group.items"
              :key="item.id"
              class="shop-row"
              @click="handleToggle(item)"
            >
              <div class="shop-row-text">
                <div class="shop-row-name-line">
                  <span class="shop-row-name">{{ item.name }}</span>
                  <span v-if="item.amount" class="shop-row-amount">
                    {{ Number.isInteger(item.amount) ? item.amount : Number(item.amount.toFixed(2)) }}{{ item.unit ? '\u00a0' + item.unit : '' }}
                  </span>
                </div>
                <span v-if="item.source === 'mealPlan'" class="shop-row-badge">Wochenplan</span>
              </div>
              <div class="shop-circle empty" />
            </button>
          </template>

          <!-- Checked items -->
          <div v-if="checkedItems.length > 0">
            <div class="section-divider section-divider--done">
              Erledigt · {{ checkedItems.length }}
            </div>
            <button
              v-for="item in checkedItems"
              :key="item.id"
              class="shop-row checked"
              @click="handleToggle(item)"
            >
              <div class="shop-row-text">
                <span class="shop-row-name">{{ item.name }}</span>
                <div class="row-pills">
                  <span
                    v-if="item.checkedBy && couple?.memberNames[item.checkedBy]"
                    class="pill-green"
                  >{{ couple.memberNames[item.checkedBy] }}</span>
                  <span v-if="item.expenseId" class="pill-teal">Ausgabe ✓</span>
                </div>
              </div>
              <div class="shop-circle filled">
                <svg viewBox="0 0 24 24" fill="none">
                  <path d="M5 13l4 4L19 7" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </div>
            </button>
          </div>

          <!-- Empty state -->
          <div v-if="items.length === 0" class="empty-state">
            <svg xmlns="http://www.w3.org/2000/svg" class="empty-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
            </svg>
            <p class="empty-text">Diese Liste ist leer</p>
          </div>

          <!-- spacer so content isn't hidden behind footer -->
          <div class="footer-spacer" />
        </div>
      </ion-content>

      <ion-footer v-if="checkedWithoutExpense.length > 0" class="ion-no-border">
        <div class="finish-bar">
          <button class="finish-btn" @click="step = 'finish'">
            Einkauf abschließen · {{ checkedWithoutExpense.length }}
            {{ checkedWithoutExpense.length === 1 ? 'Artikel' : 'Artikel' }}
          </button>
        </div>
      </ion-footer>
    </template>

    <!-- ── STEP: Finish ─────────────────────────────────────────── -->
    <template v-else>
      <ion-header>
        <ion-toolbar>
          <ion-buttons slot="start">
            <ion-button fill="clear" @click="step = 'list'">
              <ion-icon :icon="arrowBackOutline" slot="icon-only" />
            </ion-button>
          </ion-buttons>
          <ion-title>Einkauf abschließen</ion-title>
        </ion-toolbar>
      </ion-header>

      <ion-content class="ion-padding">
        <div class="finish-wrap">
          <p class="finish-meta">
            {{ checkedWithoutExpense.length }}
            {{ checkedWithoutExpense.length === 1 ? 'Artikel' : 'Artikel' }} · Ausgabe erfassen
          </p>

          <div class="space-y-4 mt-6">
            <ion-input
              v-model="finishAmount"
              type="number"
              inputmode="decimal"
              min="0.01"
              step="0.01"
              placeholder="0,00"
              fill="outline"
              label="Gesamtbetrag (€)"
              label-placement="floating"
            />

            <ion-select
              v-model="finishPaidBy"
              label="Bezahlt von"
              label-placement="floating"
              fill="outline"
              interface="action-sheet"
            >
              <ion-select-option
                v-for="(name, uid) in couple?.memberNames ?? {}"
                :key="uid"
                :value="uid"
              >
                {{ name }}
              </ion-select-option>
            </ion-select>
          </div>

          <p v-if="finishError" class="mt-3 text-sm text-red-400">{{ finishError }}</p>

          <button class="submit-btn mt-6" :disabled="submitting" @click="handleFinish">
            <ion-spinner v-if="submitting" name="crescent" class="btn-spinner" />
            <span v-else>Ausgabe erstellen &amp; fertig</span>
          </button>
        </div>
      </ion-content>
    </template>

  </ion-modal>
</template>

<style scoped>
/* ── Shopping items body ─────────────────────────────────────── */
.mode-body {
  display: flex;
  flex-direction: column;
}

.footer-spacer {
  height: 1rem;
}

/* ── Item rows ───────────────────────────────────────────────── */
.shop-row {
  display: flex;
  align-items: center;
  width: 100%;
  min-height: 4.5rem;
  padding: 0.875rem 1.25rem;
  background: transparent;
  border: 0;
  border-bottom: 1px solid rgba(51, 65, 85, 0.4);
  gap: 1rem;
  text-align: left;
  cursor: pointer;
  transition: background 0.1s;
  -webkit-tap-highlight-color: transparent;
}

.shop-row:active {
  background: rgba(34, 197, 94, 0.06);
}

.shop-row.checked {
  opacity: 0.52;
}

.shop-row-text {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  min-width: 0;
}

.shop-row-name-line {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  min-width: 0;
}

.shop-row-name {
  font-size: 1.3125rem;
  font-weight: 500;
  color: var(--app-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  min-width: 0;
}

.shop-row-amount {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--app-primary);
  white-space: nowrap;
  flex-shrink: 0;
}

.shop-row.checked .shop-row-name {
  text-decoration: line-through;
  color: var(--app-text-muted);
}

.shop-row.checked .shop-row-amount {
  color: var(--app-text-muted);
}

.shop-row-category {
  font-size: 1rem;
  color: var(--app-text-muted);
}

.row-pills {
  display: flex;
  gap: 0.375rem;
  flex-wrap: wrap;
  margin-top: 0.1rem;
}

/* ── Check circles ───────────────────────────────────────────── */
.shop-circle {
  width: 2.375rem;
  height: 2.375rem;
  border-radius: 9999px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.18s, border-color 0.18s;
}

.shop-circle.empty {
  border: 2.5px solid rgba(71, 85, 105, 0.88);
}

.shop-circle.filled {
  background: var(--app-primary);
  border: 2.5px solid var(--app-primary);
}

.shop-circle.filled svg {
  width: 1.125rem;
  height: 1.125rem;
}

/* ── Pills ───────────────────────────────────────────────────── */
.pill-green {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--app-primary);
  background: rgba(34, 197, 94, 0.12);
  border-radius: 9999px;
  padding: 0.1rem 0.5rem;
  white-space: nowrap;
}

.pill-teal {
  font-size: 0.95rem;
  font-weight: 600;
  color: #6ee7b7;
  background: rgba(110, 231, 183, 0.1);
  border-radius: 9999px;
  padding: 0.1rem 0.5rem;
  white-space: nowrap;
}

/* ── Section divider ─────────────────────────────────────────── */
.section-divider {
  padding: 0.875rem 1.25rem 0.375rem;
  font-size: 1rem;
  font-weight: 600;
  color: var(--app-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  border-bottom: 1px solid rgba(51, 65, 85, 0.4);
}

.section-divider--done {
  color: #4ade80;
  border-bottom-color: rgba(34, 197, 94, 0.2);
}

.shop-row-badge {
  font-size: 0.93rem;
  font-weight: 600;
  color: #93c5fd;
  background: rgba(59, 130, 246, 0.12);
  border-radius: 9999px;
  padding: 0.1rem 0.45rem;
  margin-top: 0.15rem;
  align-self: flex-start;
}

/* ── Empty state ─────────────────────────────────────────────── */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 5rem 1rem;
  gap: 0.75rem;
}

.empty-icon {
  width: 3rem;
  height: 3rem;
  color: #475569;
}

.empty-text {
  font-size: 1.125rem;
  color: var(--app-text-muted);
}

/* ── Finish footer bar ───────────────────────────────────────── */
.finish-bar {
  padding: 0.875rem 1.25rem calc(0.875rem + env(safe-area-inset-bottom, 0px));
  background: rgba(15, 23, 42, 0.96);
  border-top: 1px solid rgba(51, 65, 85, 0.72);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

.finish-btn {
  width: 100%;
  padding: 0.9375rem 1.5rem;
  background: var(--app-primary);
  color: #fff;
  font-family: var(--ion-font-family);
  font-weight: 700;
  font-size: 1.25rem;
  border: 0;
  border-radius: 1rem;
  cursor: pointer;
  transition: background 0.14s, transform 0.1s;
  -webkit-tap-highlight-color: transparent;
}

.finish-btn:active {
  background: var(--app-primary-strong);
  transform: scale(0.98);
}

/* ── Finish form ─────────────────────────────────────────────── */
.finish-wrap {
  padding-top: 0.5rem;
}

.finish-meta {
  font-size: 1.125rem;
  color: var(--app-text-muted);
  text-align: center;
}

.submit-btn {
  width: 100%;
  padding: 0.9375rem 1.5rem;
  background: var(--app-primary);
  color: #fff;
  font-family: var(--ion-font-family);
  font-weight: 700;
  font-size: 1.25rem;
  border: 0;
  border-radius: 1rem;
  cursor: pointer;
  transition: background 0.14s, transform 0.1s;
  -webkit-tap-highlight-color: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.submit-btn:active:not(:disabled) {
  background: var(--app-primary-strong);
  transform: scale(0.98);
}

.btn-spinner {
  width: 1.25rem;
  height: 1.25rem;
}
</style>

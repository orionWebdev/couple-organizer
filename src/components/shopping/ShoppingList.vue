<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import {
  IonList,
  IonIcon,
  IonButton,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonNote
} from '@ionic/vue'
import { addOutline, cartOutline, ellipsisHorizontal, trashOutline } from 'ionicons/icons'
import { useShopping } from '@/composables/useShopping'
import { useExpenses } from '@/composables/useExpenses'
import { useActionHub } from '@/composables/useActionHub'
import type { Couple } from '@/types'
import AppSheetModal from '@/components/ui/AppSheetModal.vue'
import IngredientInputGroup from '@/components/ui/IngredientInputGroup.vue'
import ShoppingItem from './ShoppingItem.vue'
import ShoppingModeModal from './ShoppingModeModal.vue'

const props = defineProps<{
  coupleId: string
  couple: Couple | null
}>()

const { pendingAction, consumePending } = useActionHub()

const coupleIdRef = computed<string | null>(() => props.coupleId)
const {
  lists,
  archivedLists,
  activeListId,
  activeList,
  activeItems,
  loading,
  error,
  setActiveList,
  createList,
  archiveList,
  addItem,
  toggleChecked,
  deleteItem,
  clearChecked
} = useShopping(coupleIdRef)
const { addExpense } = useExpenses(coupleIdRef)

const newListTitle = ref('')
const newItem = ref({ name: '', amount: '', unit: 'Stk' })
const newItemCategory = ref('Lebensmittel')
const showAddModal = ref(false)
const showShoppingMode = ref(false)
const pendingCreateRequestKey = ref<number | null>(null)

const quickAddName = ref('')
const quickAddInput = ref<HTMLInputElement | null>(null)

const hasCheckedItems = computed(() => activeItems.value.some((item) => item.checked))
const canArchiveActiveList = computed(() => {
  if (!activeList.value) return false
  return !activeList.value.id.endsWith('_default')
})

async function handleCreateList() {
  await createList(newListTitle.value)
  newListTitle.value = ''
}

async function handleAddItem() {
  if (!activeListId.value) return
  const parsedAmount = parseFloat(String(newItem.value.amount).replace(',', '.'))
  await addItem({
    listId: activeListId.value,
    name: newItem.value.name,
    amount: isNaN(parsedAmount) || parsedAmount <= 0 ? undefined : parsedAmount,
    unit: newItem.value.unit || undefined,
    category: newItemCategory.value
  })
  newItem.value = { name: '', amount: '', unit: 'Stk' }
  showAddModal.value = false
}

async function handleQuickAdd() {
  const name = quickAddName.value.trim()
  if (!name || !activeListId.value) return
  await addItem({
    listId: activeListId.value,
    name,
    category: newItemCategory.value
  })
  quickAddName.value = ''
  nextTick(() => quickAddInput.value?.focus())
}

function handleModalToggle(id: string, checked: boolean, uid?: string) {
  toggleChecked(id, checked, uid)
}

// Pass-through for addExpense with correct shape
async function handleAddExpense(input: {
  title: string
  amountInCents: number
  paidBy: string
  owedBy: Record<string, number>
  category: 'food'
  source: 'shopping'
  shoppingListId: string
  shoppingItemIds: string[]
}): Promise<string | null> {
  return addExpense(input)
}

watch(pendingAction, (a) => {
  if (a !== 'shopping') return
  consumePending('shopping')
  if (activeList.value) {
    showAddModal.value = true
    pendingCreateRequestKey.value = null
    return
  }
  pendingCreateRequestKey.value = 1
}, { immediate: true })

watch(activeList, (list) => {
  if (!list || pendingCreateRequestKey.value === null) return
  showAddModal.value = true
  pendingCreateRequestKey.value = null
})
</script>

<template>
  <div class="space-y-4">

    <!-- ── List selector ──────────────────────────────────────── -->
    <section class="space-y-3">
      <div class="chips-row">
        <button
          v-for="list in lists"
          :key="list.id"
          class="chip"
          :class="{ 'chip-active': list.id === activeListId }"
          @click="setActiveList(list.id)"
        >
          {{ list.title }}
        </button>
      </div>

      <form @submit.prevent="handleCreateList" class="flex gap-2">
        <ion-input
          v-model="newListTitle"
          placeholder="Neue Liste erstellen…"
          fill="outline"
          class="flex-1"
        />
        <ion-button
          type="submit"
          :disabled="!newListTitle.trim()"
          fill="solid"
          color="primary"
          class="add-list-btn"
        >
          <ion-icon :icon="addOutline" slot="icon-only" />
        </ion-button>
      </form>

      <div v-if="canArchiveActiveList && activeList" class="flex items-center gap-3">
        <ion-button fill="clear" size="small" color="danger" @click="archiveList(activeList.id)">
          <ion-icon :icon="trashOutline" slot="start" />
          Liste archivieren
        </ion-button>
        <ion-note v-if="archivedLists.length > 0" class="text-xs">
          {{ archivedLists.length }} archiviert
        </ion-note>
      </div>
    </section>

    <!-- ── Active list content ────────────────────────────────── -->
    <section v-if="activeList" class="space-y-3">

      <!-- List header: title + start shopping button -->
      <div class="flex items-center justify-between">
        <h2 class="text-base font-semibold text-slate-200">{{ activeList.title }}</h2>
        <div class="flex items-center gap-2">
          <ion-button
            v-if="hasCheckedItems"
            fill="clear"
            size="small"
            color="danger"
            @click="clearChecked(activeList.id)"
          >
            Abgehakte löschen
          </ion-button>
          <button
            v-if="activeItems.length > 0"
            class="start-session-btn"
            @click="showShoppingMode = true"
          >
            <ion-icon :icon="cartOutline" class="text-base" />
            Einkaufen
          </button>
        </div>
      </div>

      <p v-if="error" class="text-center text-red-400 text-sm py-2">{{ error }}</p>

      <div v-if="loading" class="flex justify-center py-8">
        <ion-spinner name="crescent" color="primary" />
      </div>

      <div v-else-if="activeItems.length === 0" class="empty-list">
        <svg xmlns="http://www.w3.org/2000/svg" class="empty-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
        </svg>
        <p class="text-slate-500 text-sm">Noch keine Artikel · trage unten deinen ersten ein</p>
      </div>

      <ion-list v-else lines="none" class="space-y-2">
        <ShoppingItem
          v-for="item in activeItems"
          :key="item.id"
          :item="item"
          @toggle="(id, checked) => toggleChecked(id, checked)"
          @delete="deleteItem"
        />
      </ion-list>

      <!-- ── Inline quick-add ──────────────────────────────────── -->
      <form class="quick-add" @submit.prevent="handleQuickAdd">
        <input
          ref="quickAddInput"
          v-model="quickAddName"
          type="text"
          enterkeyhint="done"
          placeholder="Artikel hinzufügen…"
          class="quick-add-input"
        />
        <button
          type="button"
          class="quick-add-more"
          aria-label="Mit Details hinzufügen"
          @click="showAddModal = true"
        >
          <ion-icon :icon="ellipsisHorizontal" />
        </button>
        <button
          type="submit"
          class="quick-add-btn"
          :disabled="!quickAddName.trim()"
          aria-label="Artikel hinzufügen"
        >
          <ion-icon :icon="addOutline" />
        </button>
      </form>
    </section>

    <!-- ── Sheet: add item ────────────────────────────────────── -->
    <AppSheetModal
      :is-open="showAddModal"
      title="Artikel hinzufügen"
      :breakpoints="[0, 0.62, 0.85]"
      :initial-breakpoint="0.62"
      close-label="Fertig"
      @close="showAddModal = false"
    >
      <form @submit.prevent="handleAddItem" class="space-y-4">
        <IngredientInputGroup
          v-model="newItem"
          name-placeholder="Artikel eingeben…"
          :autofocus="true"
        />

        <ion-select
          v-model="newItemCategory"
          label="Kategorie"
          label-placement="floating"
          fill="outline"
          interface="action-sheet"
        >
          <ion-select-option value="Lebensmittel">Lebensmittel</ion-select-option>
          <ion-select-option value="Drogerie">Drogerie</ion-select-option>
          <ion-select-option value="Haushalt">Haushalt</ion-select-option>
          <ion-select-option value="Sonstiges">Sonstiges</ion-select-option>
        </ion-select>

        <ion-button expand="block" type="submit" :disabled="!newItem.name.trim()">
          Hinzufügen
        </ion-button>
      </form>
    </AppSheetModal>

    <!-- ── Shopping mode (fullscreen) ────────────────────────── -->
    <ShoppingModeModal
      v-if="activeList"
      :is-open="showShoppingMode"
      :items="activeItems"
      :list-id="activeList.id"
      :list-title="activeList.title"
      :couple="couple"
      :add-expense="handleAddExpense"
      @toggle="handleModalToggle"
      @close="showShoppingMode = false"
    />
  </div>
</template>

<style scoped>
/* ── Add list button ─────────────────────────────────────────── */
.add-list-btn {
  width: 54px;
  min-width: 54px;
  height: 48px;
}

/* ── List selector chips ─────────────────────────────────────── */
.chips-row {
  display: flex;
  gap: 0.5rem;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  padding-bottom: 2px;
  scrollbar-width: none;
}

.chips-row::-webkit-scrollbar {
  display: none;
}

.chip {
  flex-shrink: 0;
  padding: 0.4rem 0.875rem;
  border-radius: 9999px;
  border: 1px solid rgba(71, 85, 105, 0.5);
  background: rgba(30, 41, 59, 0.7);
  color: #94a3b8;
  font-family: var(--ion-font-family);
  font-size: 1.125rem;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
  transition: background 0.18s, border-color 0.18s, color 0.18s;
  -webkit-tap-highlight-color: transparent;
}

.chip-active {
  background: rgba(var(--app-primary-rgb), 0.15);
  border-color: rgba(var(--app-primary-rgb), 0.45);
  color: var(--app-primary-tint);
}

/* ── Start session button ────────────────────────────────────── */
.start-session-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.4rem 0.875rem;
  background: rgba(var(--app-primary-rgb), 0.14);
  color: var(--app-primary-tint);
  border: 1px solid rgba(var(--app-primary-rgb), 0.36);
  border-radius: 9999px;
  font-family: var(--ion-font-family);
  font-size: 1.0625rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.14s, border-color 0.14s;
  -webkit-tap-highlight-color: transparent;
}

.start-session-btn:active {
  background: rgba(var(--app-primary-rgb), 0.22);
  border-color: rgba(var(--app-primary-rgb), 0.56);
}

/* ── Quick-add ───────────────────────────────────────────────── */
.quick-add {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.65rem;
  border-radius: 1.4rem;
  background: rgba(15, 23, 42, 0.85);
  border: 1px solid rgba(71, 85, 105, 0.5);
  margin-top: 0.5rem;
}

.quick-add-input {
  flex: 1;
  min-width: 0;
  background: transparent;
  border: 0;
  outline: none;
  color: var(--app-text);
  font-family: var(--ion-font-family);
  font-size: 1.125rem;
  padding: 0.8rem 0.9rem;
}

.quick-add-input::placeholder {
  color: var(--app-text-muted);
}

.quick-add-more,
.quick-add-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 3rem;
  height: 3rem;
  border-radius: 9999px;
  border: 0;
  cursor: pointer;
  font-size: 1.4rem;
  flex-shrink: 0;
  -webkit-tap-highlight-color: transparent;
  transition: background 0.14s, color 0.14s, transform 0.1s;
}

.quick-add-more {
  background: rgba(71, 85, 105, 0.35);
  color: var(--app-text-muted);
}

.quick-add-more:active {
  background: rgba(71, 85, 105, 0.55);
}

.quick-add-btn {
  background: var(--app-primary);
  color: #fff;
}

.quick-add-btn:active:not(:disabled) {
  transform: scale(0.94);
  background: var(--app-primary-strong);
}

.quick-add-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* ── Empty list ──────────────────────────────────────────────── */
.empty-list {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 1rem;
  gap: 0.625rem;
  text-align: center;
}

.empty-icon {
  width: 3rem;
  height: 3rem;
  color: #334155;
}
</style>

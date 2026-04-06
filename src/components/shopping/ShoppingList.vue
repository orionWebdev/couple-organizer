<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  IonList,
  IonFab,
  IonFabButton,
  IonIcon,
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonButton,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonChip,
  IonLabel,
  IonSpinner,
  IonNote
} from '@ionic/vue'
import { addOutline, receiptOutline } from 'ionicons/icons'
import { useShopping } from '@/composables/useShopping'
import { useExpenses } from '@/composables/useExpenses'
import { useAuth } from '@/composables/useAuth'
import type { Couple } from '@/types'
import ShoppingItem from './ShoppingItem.vue'

const props = defineProps<{
  coupleId: string
  couple: Couple | null
}>()

const { user } = useAuth()

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
const newItemName = ref('')
const newItemCategory = ref('Lebensmittel')
const financeTitle = ref('')
const financeAmount = ref('')
const financePaidBy = ref(user.value?.uid || '')
const financeMessage = ref<string | null>(null)
const financeError = ref<string | null>(null)
const creatingExpense = ref(false)

const showAddModal = ref(false)
const showExpenseModal = ref(false)

watch(() => props.couple, (couple) => {
  if (!couple) return
  if (!financePaidBy.value || !(financePaidBy.value in couple.memberNames)) {
    financePaidBy.value = user.value?.uid || Object.keys(couple.memberNames)[0] || ''
  }
}, { immediate: true })

const checkedItemsWithoutExpense = computed(() => {
  return activeItems.value.filter((item) => item.checked && !item.expenseId)
})

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
  await addItem({
    listId: activeListId.value,
    name: newItemName.value,
    category: newItemCategory.value
  })
  newItemName.value = ''
  showAddModal.value = false
}

async function handleCreateShoppingExpense() {
  financeMessage.value = null
  financeError.value = null

  const amount = Number(String(financeAmount.value).replace(',', '.'))
  if (!activeList.value) {
    financeError.value = 'Bitte zuerst eine aktive Einkaufsliste auswählen.'
    return
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    financeError.value = 'Bitte einen gültigen Betrag eingeben.'
    return
  }
  if (!financePaidBy.value) {
    financeError.value = 'Bitte auswählen, wer bezahlt hat.'
    return
  }
  if (checkedItemsWithoutExpense.value.length === 0) {
    financeError.value = 'Es sind keine abgehakten Artikel ohne Ausgabe vorhanden.'
    return
  }

  creatingExpense.value = true
  const title = financeTitle.value.trim() || `Einkauf ${activeList.value.title}`
  const expenseId = await addExpense({
    title,
    amountInCents: Math.round(amount * 100),
    paidBy: financePaidBy.value,
    category: 'food',
    source: 'shopping',
    shoppingListId: activeList.value.id,
    shoppingItemIds: checkedItemsWithoutExpense.value.map((item) => item.id)
  })

  if (!expenseId) {
    financeError.value = 'Ausgabe konnte nicht angelegt werden.'
    creatingExpense.value = false
    return
  }

  financeTitle.value = ''
  financeAmount.value = ''
  financeMessage.value = `Ausgabe wurde erstellt und ${checkedItemsWithoutExpense.value.length} Artikel verknüpft.`
  creatingExpense.value = false
  showExpenseModal.value = false
}
</script>

<template>
  <div class="space-y-4">
    <!-- List selector -->
    <section class="space-y-3">
      <div class="flex gap-2 overflow-x-auto pb-1">
        <ion-chip
          v-for="list in lists"
          :key="list.id"
          :color="list.id === activeListId ? 'primary' : 'medium'"
          @click="setActiveList(list.id)"
        >
          <ion-label>{{ list.title }}</ion-label>
        </ion-chip>
      </div>

      <form @submit.prevent="handleCreateList" class="flex gap-2">
        <ion-input
          v-model="newListTitle"
          placeholder="Neue Liste"
          fill="outline"
          class="flex-1"
        />
        <ion-button
          type="submit"
          :disabled="!newListTitle.trim()"
          color="medium"
        >
          Erstellen
        </ion-button>
      </form>

      <div class="flex items-center gap-4">
        <ion-button
          v-if="canArchiveActiveList && activeList"
          fill="clear"
          size="small"
          color="danger"
          @click="archiveList(activeList.id)"
        >
          Liste archivieren
        </ion-button>
        <ion-note v-if="archivedLists.length > 0" class="text-xs">
          Archivierte Listen: {{ archivedLists.length }}
        </ion-note>
      </div>
    </section>

    <!-- Items -->
    <section v-if="activeList" class="space-y-3">
      <ion-button
        v-if="hasCheckedItems"
        fill="clear"
        size="small"
        color="danger"
        @click="clearChecked(activeList.id)"
      >
        Abgehakte entfernen
      </ion-button>

      <p v-if="error" class="text-center text-red-400 text-sm py-2">{{ error }}</p>

      <div v-if="loading" class="flex justify-center py-8">
        <ion-spinner name="crescent" color="primary" />
      </div>

      <div v-else-if="activeItems.length === 0" class="text-center py-12">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 mx-auto text-slate-600 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
        </svg>
        <p class="text-slate-500 text-sm">Die aktive Einkaufsliste ist leer</p>
      </div>

      <ion-list v-else lines="none" class="space-y-2">
        <ShoppingItem
          v-for="item in activeItems"
          :key="item.id"
          :item="item"
          @toggle="toggleChecked"
          @delete="deleteItem"
        />
      </ion-list>
    </section>

    <!-- Expense button -->
    <ion-button
      v-if="activeList && checkedItemsWithoutExpense.length > 0"
      expand="block"
      fill="outline"
      @click="showExpenseModal = true"
    >
      <ion-icon :icon="receiptOutline" slot="start" />
      Ausgabe aus Einkauf erfassen ({{ checkedItemsWithoutExpense.length }})
    </ion-button>

    <!-- FAB to add item -->
    <ion-fab v-if="activeList" vertical="bottom" horizontal="end" slot="fixed" class="mb-2 mr-2">
      <ion-fab-button @click="showAddModal = true" color="primary">
        <ion-icon :icon="addOutline" />
      </ion-fab-button>
    </ion-fab>

    <!-- Add Item Modal -->
    <ion-modal
      :is-open="showAddModal"
      :breakpoints="[0, 0.45]"
      :initial-breakpoint="0.45"
      @did-dismiss="showAddModal = false"
    >
      <ion-header>
        <ion-toolbar>
          <ion-title>Artikel hinzufügen</ion-title>
          <ion-buttons slot="end">
            <ion-button @click="showAddModal = false">Fertig</ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>
      <ion-content class="ion-padding">
        <form @submit.prevent="handleAddItem" class="space-y-4">
          <ion-input
            v-model="newItemName"
            placeholder="Artikel eingeben..."
            fill="outline"
            label="Artikel"
            label-placement="floating"
            :clear-input="true"
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
          <ion-button expand="block" type="submit" :disabled="!newItemName.trim()">
            Hinzufügen
          </ion-button>
        </form>
      </ion-content>
    </ion-modal>

    <!-- Expense Modal -->
    <ion-modal
      :is-open="showExpenseModal"
      :breakpoints="[0, 0.55]"
      :initial-breakpoint="0.55"
      @did-dismiss="showExpenseModal = false"
    >
      <ion-header>
        <ion-toolbar>
          <ion-title>Ausgabe erfassen</ion-title>
          <ion-buttons slot="end">
            <ion-button @click="showExpenseModal = false">Fertig</ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>
      <ion-content class="ion-padding">
        <div class="space-y-4">
          <ion-input
            v-model="financeTitle"
            placeholder="Titel (optional)"
            fill="outline"
            label="Titel"
            label-placement="floating"
          />
          <div class="flex gap-2">
            <ion-input
              v-model="financeAmount"
              type="number"
              min="0.01"
              step="0.01"
              placeholder="0,00"
              fill="outline"
              label="Betrag (€)"
              label-placement="floating"
              class="flex-1"
            />
            <ion-select
              v-model="financePaidBy"
              label="Bezahlt von"
              label-placement="floating"
              fill="outline"
              interface="action-sheet"
              class="flex-1"
            >
              <ion-select-option
                v-for="(name, uid) in couple?.memberNames || {}"
                :key="uid"
                :value="uid"
              >
                {{ name }}
              </ion-select-option>
            </ion-select>
          </div>

          <ion-note class="block text-xs">
            Abgehakte Artikel ohne bestehende Ausgabe: {{ checkedItemsWithoutExpense.length }}
          </ion-note>

          <ion-button
            expand="block"
            @click="handleCreateShoppingExpense"
            :disabled="creatingExpense || checkedItemsWithoutExpense.length === 0"
          >
            {{ creatingExpense ? 'Speichere...' : 'Als Lebensmittel-Ausgabe speichern' }}
          </ion-button>

          <p v-if="financeMessage" class="text-sm text-green-400">{{ financeMessage }}</p>
          <p v-if="financeError" class="text-sm text-red-400">{{ financeError }}</p>
        </div>
      </ion-content>
    </ion-modal>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
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
}
</script>

<template>
  <div class="space-y-4">
    <section class="bg-slate-800 rounded-2xl border border-slate-700 p-4 space-y-3">
      <h3 class="font-semibold text-sm text-slate-400 uppercase tracking-wide">Listen</h3>

      <div class="flex gap-2 overflow-x-auto pb-1">
        <button
          v-for="list in lists"
          :key="list.id"
          @click="setActiveList(list.id)"
          class="px-3 py-2 rounded-xl text-sm border whitespace-nowrap transition-colors"
          :class="list.id === activeListId ? 'bg-green-600 border-green-500 text-white' : 'border-slate-600 text-slate-300 hover:border-slate-500'"
        >
          {{ list.title }}
        </button>
      </div>

      <form @submit.prevent="handleCreateList" class="flex gap-2">
        <input
          v-model="newListTitle"
          type="text"
          placeholder="Neue Liste"
          class="flex-1 px-3 py-2.5 border border-slate-600 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-sm"
        />
        <button
          type="submit"
          :disabled="!newListTitle.trim()"
          class="px-4 py-2.5 bg-slate-700 text-slate-100 rounded-xl text-sm font-medium hover:bg-slate-600 disabled:opacity-50 transition-colors"
        >
          Erstellen
        </button>
      </form>

      <button
        v-if="canArchiveActiveList && activeList"
        @click="archiveList(activeList.id)"
        class="text-xs text-slate-500 hover:text-red-400 transition-colors"
      >
        Aktive Liste archivieren
      </button>
      <p v-if="archivedLists.length > 0" class="text-xs text-slate-500">
        Archivierte Listen: {{ archivedLists.length }}
      </p>
    </section>

    <section v-if="activeList" class="space-y-3">
      <form @submit.prevent="handleAddItem" class="grid grid-cols-12 gap-2">
        <input
          v-model="newItemName"
          type="text"
          placeholder="Artikel hinzufügen..."
          class="col-span-6 px-3 py-2.5 border border-slate-600 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-sm"
        />
        <select
          v-model="newItemCategory"
          class="col-span-4 px-3 py-2.5 border border-slate-600 rounded-xl text-sm bg-slate-700 text-slate-100 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
        >
          <option>Lebensmittel</option>
          <option>Drogerie</option>
          <option>Haushalt</option>
          <option>Sonstiges</option>
        </select>
        <button
          type="submit"
          :disabled="!newItemName.trim()"
          class="col-span-2 px-3 py-2.5 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
        >
          +
        </button>
      </form>

      <button
        v-if="hasCheckedItems"
        @click="clearChecked(activeList.id)"
        class="text-sm text-slate-500 hover:text-red-400 transition-colors"
      >
        Abgehakte entfernen
      </button>

      <p v-if="error" class="text-center text-red-400 text-sm py-2">{{ error }}</p>
      <p v-if="loading" class="text-center text-slate-500 text-sm py-4">Laden...</p>

      <div v-else-if="activeItems.length === 0" class="text-center py-12">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 mx-auto text-slate-600 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
        </svg>
        <p class="text-slate-500 text-sm">Die aktive Einkaufsliste ist leer</p>
      </div>

      <ShoppingItem
        v-for="item in activeItems"
        :key="item.id"
        :item="item"
        @toggle="toggleChecked"
        @delete="deleteItem"
      />
    </section>

    <section v-if="activeList" class="bg-slate-800 rounded-2xl border border-slate-700 p-4 space-y-3">
      <h3 class="font-semibold text-sm text-slate-400 uppercase tracking-wide">
        Ausgabe aus Einkauf erfassen
      </h3>

      <input
        v-model="financeTitle"
        type="text"
        placeholder="Titel (optional)"
        class="w-full px-3 py-2.5 border border-slate-600 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-sm"
      />

      <div class="grid grid-cols-12 gap-2">
        <div class="col-span-6 relative">
          <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">€</span>
          <input
            v-model="financeAmount"
            type="number"
            min="0.01"
            step="0.01"
            placeholder="0,00"
            class="w-full pl-8 pr-3 py-2.5 border border-slate-600 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-sm"
          />
        </div>
        <select
          v-model="financePaidBy"
          class="col-span-6 px-3 py-2.5 border border-slate-600 rounded-xl text-sm bg-slate-700 text-slate-100 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
        >
          <option
            v-for="(name, uid) in couple?.memberNames || {}"
            :key="uid"
            :value="uid"
          >
            {{ name }}
          </option>
        </select>
      </div>

      <p class="text-xs text-slate-500">
        Abgehakte Artikel ohne bestehende Ausgabe: {{ checkedItemsWithoutExpense.length }}
      </p>

      <button
        @click="handleCreateShoppingExpense"
        :disabled="creatingExpense || checkedItemsWithoutExpense.length === 0"
        class="w-full py-2.5 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
      >
        {{ creatingExpense ? 'Speichere...' : 'Als Lebensmittel-Ausgabe speichern' }}
      </button>

      <p v-if="financeMessage" class="text-sm text-green-400">{{ financeMessage }}</p>
      <p v-if="financeError" class="text-sm text-red-400">{{ financeError }}</p>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watchEffect } from 'vue'
import { useShopping } from '@/composables/useShopping'
import ShoppingItem from './ShoppingItem.vue'

const props = defineProps<{
  coupleId: string
}>()

const coupleIdRef = computed<string | null>(() => props.coupleId)
const { items, loading, error, addItem, toggleBought, deleteItem, clearBought } = useShopping(coupleIdRef)

const newName = ref('')

async function handleAdd() {
  const name = newName.value.trim()
  if (!name) return
  await addItem(name)
  newName.value = ''
}

const hasBought = ref(false)
watchEffect(() => {
  hasBought.value = items.value.some((i) => i.bought)
})
</script>

<template>
  <div class="space-y-3">
    <!-- Add form -->
    <form @submit.prevent="handleAdd" class="flex gap-2">
      <input
        v-model="newName"
        type="text"
        placeholder="Artikel hinzufügen..."
        class="flex-1 px-3 py-2.5 border border-slate-600 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-sm"
      />
      <button
        type="submit"
        :disabled="!newName.trim()"
        class="px-4 py-2.5 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
      >
        Hinzufügen
      </button>
    </form>

    <!-- Clear bought button -->
    <button
      v-if="hasBought"
      @click="clearBought"
      class="text-sm text-slate-500 hover:text-red-400 transition-colors"
    >
      Gekaufte entfernen
    </button>

    <!-- Error -->
    <p v-if="error" class="text-center text-red-400 text-sm py-2">{{ error }}</p>

    <!-- Loading -->
    <p v-if="loading" class="text-center text-slate-500 text-sm py-4">Laden...</p>

    <!-- Empty state -->
    <div v-else-if="items.length === 0" class="text-center py-12">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 mx-auto text-slate-600 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
        <path stroke-linecap="round" stroke-linejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
      </svg>
      <p class="text-slate-500 text-sm">Die Einkaufsliste ist leer</p>
    </div>

    <!-- Items -->
    <ShoppingItem
      v-for="item in items"
      :key="item.id"
      :item="item"
      @toggle="toggleBought"
      @delete="deleteItem"
    />
  </div>
</template>

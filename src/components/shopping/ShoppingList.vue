<script setup lang="ts">
import { ref } from 'vue'
import type { Ref } from 'vue'
import { useShopping } from '@/composables/useShopping'
import ShoppingItem from './ShoppingItem.vue'

const props = defineProps<{
  coupleId: string
}>()

const coupleIdRef = ref(props.coupleId) as Ref<string | null>
const { items, loading, addItem, toggleBought, deleteItem, clearBought } = useShopping(coupleIdRef)

const newName = ref('')

async function handleAdd() {
  const name = newName.value.trim()
  if (!name) return
  await addItem(name)
  newName.value = ''
}

const hasBought = ref(false)
// Update hasBought reactively based on items
import { watchEffect } from 'vue'
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
        placeholder="Add an item..."
        class="flex-1 px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-sm"
      />
      <button
        type="submit"
        :disabled="!newName.trim()"
        class="px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
      >
        Add
      </button>
    </form>

    <!-- Clear bought button -->
    <button
      v-if="hasBought"
      @click="clearBought"
      class="text-sm text-gray-400 hover:text-red-500 transition-colors"
    >
      Clear bought items
    </button>

    <!-- Loading -->
    <p v-if="loading" class="text-center text-gray-400 text-sm py-4">Loading...</p>

    <!-- Empty state -->
    <p v-else-if="items.length === 0" class="text-center text-gray-400 text-sm py-8">
      Shopping list is empty. Add items above!
    </p>

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

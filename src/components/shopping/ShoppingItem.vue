<script setup lang="ts">
import type { ShoppingItem } from '@/types'

defineProps<{
  item: ShoppingItem
}>()

const emit = defineEmits<{
  toggle: [id: string, bought: boolean]
  delete: [id: string]
}>()
</script>

<template>
  <div
    class="flex items-center gap-3 p-4 bg-slate-800 rounded-2xl border border-slate-700"
    :class="{ 'opacity-50': item.bought }"
  >
    <input
      type="checkbox"
      :checked="item.bought"
      @change="emit('toggle', item.id, !item.bought)"
      class="h-5 w-5 rounded border-slate-500 text-green-500 focus:ring-green-500 cursor-pointer"
    />
    <span class="flex-1 text-sm text-slate-100" :class="{ 'line-through text-slate-500': item.bought }">
      {{ item.name }}
    </span>
    <button
      @click="emit('delete', item.id)"
      class="text-slate-600 hover:text-red-400 transition-colors"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  </div>
</template>

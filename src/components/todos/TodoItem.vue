<script setup lang="ts">
import type { Todo, Couple } from '@/types'

defineProps<{
  todo: Todo
  couple: Couple | null
}>()

const emit = defineEmits<{
  toggle: [id: string, done: boolean]
  assign: [id: string, assignedTo: string | null]
  delete: [id: string]
}>()
</script>

<template>
  <div
    class="flex items-center gap-3 p-4 bg-slate-800 rounded-2xl border border-slate-700"
    :class="{ 'opacity-50': todo.done }"
  >
    <!-- Checkbox -->
    <input
      type="checkbox"
      :checked="todo.done"
      @change="emit('toggle', todo.id, !todo.done)"
      class="h-5 w-5 rounded border-slate-500 text-green-500 focus:ring-green-500 cursor-pointer"
    />

    <!-- Title -->
    <span class="flex-1 text-sm text-slate-100" :class="{ 'line-through text-slate-500': todo.done }">
      {{ todo.title }}
    </span>

    <!-- Assignee selector -->
    <select
      v-if="couple"
      :value="todo.assignedTo || ''"
      @change="emit('assign', todo.id, ($event.target as HTMLSelectElement).value || null)"
      class="text-xs border border-slate-600 rounded-lg px-2 py-1 bg-slate-700 text-slate-300"
    >
      <option value="">Nicht zugewiesen</option>
      <option
        v-for="(name, uid) in couple.memberNames"
        :key="uid"
        :value="uid"
      >
        {{ name }}
      </option>
    </select>

    <!-- Delete -->
    <button
      @click="emit('delete', todo.id)"
      class="text-slate-600 hover:text-red-400 transition-colors"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useTodos } from '@/composables/useTodos'
import type { Couple } from '@/types'
import TodoItem from './TodoItem.vue'

const props = defineProps<{
  coupleId: string
  couple: Couple | null
}>()

const coupleIdRef = computed<string | null>(() => props.coupleId)
const { todos, loading, error, addTodo, toggleTodo, updateTodo, deleteTodo } = useTodos(coupleIdRef)

const newTitle = ref('')

async function handleAdd() {
  const title = newTitle.value.trim()
  if (!title) return
  await addTodo(title)
  newTitle.value = ''
}
</script>

<template>
  <div class="space-y-3">
    <!-- Add form -->
    <form @submit.prevent="handleAdd" class="flex gap-2">
      <input
        v-model="newTitle"
        type="text"
        placeholder="Neue Aufgabe..."
        class="flex-1 px-3 py-2.5 border border-slate-600 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-sm"
      />
      <button
        type="submit"
        :disabled="!newTitle.trim()"
        class="px-4 py-2.5 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
      >
        Hinzufügen
      </button>
    </form>

    <!-- Error -->
    <p v-if="error" class="text-center text-red-400 text-sm py-2">{{ error }}</p>

    <!-- Loading -->
    <p v-if="loading" class="text-center text-slate-500 text-sm py-4">Laden...</p>

    <!-- Empty state -->
    <div v-else-if="todos.length === 0" class="text-center py-12">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 mx-auto text-slate-600 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
        <path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
      <p class="text-slate-500 text-sm">Noch keine Aufgaben vorhanden</p>
    </div>

    <!-- Todo items -->
    <TodoItem
      v-for="todo in todos"
      :key="todo.id"
      :todo="todo"
      :couple="couple"
      @toggle="toggleTodo"
      @assign="(id, to) => updateTodo(id, { assignedTo: to })"
      @delete="deleteTodo"
    />
  </div>
</template>

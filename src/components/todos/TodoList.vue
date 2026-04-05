<script setup lang="ts">
import { ref } from 'vue'
import type { Ref } from 'vue'
import { useTodos } from '@/composables/useTodos'
import type { Couple } from '@/types'
import TodoItem from './TodoItem.vue'

const props = defineProps<{
  coupleId: string
  couple: Couple | null
}>()

const coupleIdRef = ref(props.coupleId) as Ref<string | null>
const { todos, loading, addTodo, toggleTodo, updateTodo, deleteTodo } = useTodos(coupleIdRef)

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
        placeholder="Add a todo..."
        class="flex-1 px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm"
      />
      <button
        type="submit"
        :disabled="!newTitle.trim()"
        class="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
      >
        Add
      </button>
    </form>

    <!-- Loading -->
    <p v-if="loading" class="text-center text-gray-400 text-sm py-4">Loading...</p>

    <!-- Empty state -->
    <p v-else-if="todos.length === 0" class="text-center text-gray-400 text-sm py-8">
      No todos yet. Add one above!
    </p>

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

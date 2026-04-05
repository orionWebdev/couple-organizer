<script setup lang="ts">
import { ref } from 'vue'
import { useAuth } from '@/composables/useAuth'
import { useCouple } from '@/composables/useCouple'
import AppHeader from '@/components/layout/AppHeader.vue'
import AppNav from '@/components/layout/AppNav.vue'
import TodoList from '@/components/todos/TodoList.vue'
import ShoppingList from '@/components/shopping/ShoppingList.vue'
import ExpenseList from '@/components/expenses/ExpenseList.vue'

const { user } = useAuth()
const { couple, watchCouple } = useCouple()

// Start watching couple data
if (user.value?.coupleId) {
  watchCouple(user.value.coupleId)
}

const activeTab = ref('todos')
</script>

<template>
  <div class="min-h-screen pb-16">
    <AppHeader />

    <main class="max-w-lg mx-auto px-4 py-4">
      <!-- Todos -->
      <div v-if="activeTab === 'todos'">
        <h2 class="text-lg font-bold mb-3">Todos</h2>
        <TodoList
          v-if="user?.coupleId"
          :couple-id="user.coupleId"
          :couple="couple"
        />
      </div>

      <!-- Shopping -->
      <div v-if="activeTab === 'shopping'">
        <h2 class="text-lg font-bold mb-3">Shopping List</h2>
        <ShoppingList
          v-if="user?.coupleId"
          :couple-id="user.coupleId"
        />
      </div>

      <!-- Expenses -->
      <div v-if="activeTab === 'expenses'">
        <h2 class="text-lg font-bold mb-3">Expenses</h2>
        <ExpenseList
          v-if="user?.coupleId"
          :couple-id="user.coupleId"
          :couple="couple"
        />
      </div>
    </main>

    <AppNav v-model:active-tab="activeTab" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useAuth } from '@/composables/useAuth'
import { useCouple } from '@/composables/useCouple'
import AppHeader from '@/components/layout/AppHeader.vue'
import AppNav from '@/components/layout/AppNav.vue'
import OverviewTab from '@/components/overview/OverviewTab.vue'
import TodoList from '@/components/todos/TodoList.vue'
import RecipeManager from '@/components/recipes/RecipeManager.vue'
import MealPlanBoard from '@/components/meal-plan/MealPlanBoard.vue'
import ShoppingList from '@/components/shopping/ShoppingList.vue'
import ExpenseList from '@/components/expenses/ExpenseList.vue'

const { user } = useAuth()
const { couple, watchCouple } = useCouple()

if (user.value?.coupleId) {
  watchCouple(user.value.coupleId)
}

const activeTab = ref('overview')
</script>

<template>
  <div class="min-h-screen pb-24">
    <AppHeader />

    <main class="max-w-lg mx-auto px-4 py-4">
      <!-- Übersicht -->
      <div v-show="activeTab === 'overview'">
        <h2 class="text-lg font-bold mb-3 text-slate-100">Übersicht</h2>
        <OverviewTab
          v-if="user?.coupleId"
          :couple-id="user.coupleId"
          :couple="couple"
          @switch-tab="activeTab = $event"
        />
      </div>

      <!-- Use v-show to keep components alive so onSnapshot listeners persist -->
      <div v-show="activeTab === 'todos'">
        <h2 class="text-lg font-bold mb-3 text-slate-100">Aufgaben</h2>
        <TodoList
          v-if="user?.coupleId"
          :couple-id="user.coupleId"
          :couple="couple"
        />
      </div>

      <div v-show="activeTab === 'shopping'">
        <h2 class="text-lg font-bold mb-3 text-slate-100">Einkaufsliste</h2>
        <ShoppingList
          v-if="user?.coupleId"
          :couple-id="user.coupleId"
          :couple="couple"
        />
      </div>

      <div v-show="activeTab === 'recipes'">
        <h2 class="text-lg font-bold mb-3 text-slate-100">Rezepte</h2>
        <RecipeManager
          v-if="user?.coupleId"
          :couple-id="user.coupleId"
        />
      </div>

      <div v-show="activeTab === 'mealPlan'">
        <h2 class="text-lg font-bold mb-3 text-slate-100">Wochenplan</h2>
        <MealPlanBoard
          v-if="user?.coupleId"
          :couple-id="user.coupleId"
        />
      </div>

      <div v-show="activeTab === 'expenses'">
        <h2 class="text-lg font-bold mb-3 text-slate-100">Finanzen</h2>
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

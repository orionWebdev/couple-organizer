<script setup lang="ts">
import { ref } from 'vue'
import { IonPage, IonContent } from '@ionic/vue'
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
  <ion-page>
    <AppHeader v-if="!['overview', 'todos', 'expenses'].includes(activeTab)" />

    <ion-content class="ion-padding">
      <div class="mx-auto max-w-lg pb-16" :class="activeTab === 'overview' ? 'pt-2' : 'pt-1'">
        <!-- Use v-show to keep components alive so onSnapshot listeners persist -->
        <div v-show="activeTab === 'overview'">
          <OverviewTab
            v-if="user?.coupleId"
            :couple-id="user.coupleId"
            :couple="couple"
            @switch-tab="activeTab = $event"
          />
        </div>

        <div v-show="activeTab === 'todos'">
          <TodoList
            v-if="user?.coupleId"
            :couple-id="user.coupleId"
            :couple="couple"
          />
        </div>

        <div v-show="activeTab === 'shopping'">
          <ShoppingList
            v-if="user?.coupleId"
            :couple-id="user.coupleId"
            :couple="couple"
          />
        </div>

        <div v-show="activeTab === 'recipes'">
          <RecipeManager
            v-if="user?.coupleId"
            :couple-id="user.coupleId"
          />
        </div>

        <div v-show="activeTab === 'mealPlan'">
          <MealPlanBoard
            v-if="user?.coupleId"
            :couple-id="user.coupleId"
          />
        </div>

        <div v-show="activeTab === 'expenses'">
          <ExpenseList
            v-if="user?.coupleId"
            :couple-id="user.coupleId"
            :couple="couple"
          />
        </div>
      </div>
    </ion-content>

    <AppNav v-model:active-tab="activeTab" />
  </ion-page>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonContent,
  IonSegment,
  IonSegmentButton,
  IonLabel
} from '@ionic/vue'
import { useAuth } from '@/composables/useAuth'
import { useCouple } from '@/composables/useCouple'
import TodoList from '@/components/todos/TodoList.vue'
import RecipeManager from '@/components/recipes/RecipeManager.vue'
import MealPlanBoard from '@/components/meal-plan/MealPlanBoard.vue'

const { user } = useAuth()
const { couple } = useCouple()

type Segment = 'todos' | 'recipes' | 'mealPlan'
const activeSegment = ref<Segment>('todos')
const todoCreateKey = ref(0)
</script>

<template>
  <ion-page>
    <ion-header>
      <ion-toolbar class="segment-toolbar">
        <ion-segment v-model="activeSegment" mode="md">
          <ion-segment-button value="todos">
            <ion-label>Aufgaben</ion-label>
          </ion-segment-button>
          <ion-segment-button value="recipes">
            <ion-label>Rezepte</ion-label>
          </ion-segment-button>
          <ion-segment-button value="mealPlan">
            <ion-label>Wochenplan</ion-label>
          </ion-segment-button>
        </ion-segment>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="mx-auto max-w-lg px-4 pt-3 pb-24">
        <Transition name="seg" mode="out-in">
          <div :key="activeSegment" class="seg-content">
            <template v-if="activeSegment === 'todos'">
              <TodoList
                v-if="user?.coupleId"
                :couple-id="user.coupleId"
                :couple="couple"
                :create-request-key="todoCreateKey"
              />
            </template>

            <template v-else-if="activeSegment === 'recipes'">
              <RecipeManager
                v-if="user?.coupleId"
                :couple-id="user.coupleId"
              />
            </template>

            <template v-else-if="activeSegment === 'mealPlan'">
              <MealPlanBoard
                v-if="user?.coupleId"
                :couple-id="user.coupleId"
              />
            </template>
          </div>
        </Transition>
      </div>
    </ion-content>
  </ion-page>
</template>

<style scoped>
.segment-toolbar {
  --min-height: 3.25rem;
  --padding-start: 1rem;
  --padding-end: 1rem;
}

/* Segment transition */
.seg-enter-active,
.seg-leave-active {
  transition:
    opacity 0.18s ease,
    transform 0.18s ease;
}

.seg-enter-from {
  opacity: 0;
  transform: translateY(8px);
}

.seg-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>

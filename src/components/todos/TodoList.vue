<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  IonList,
  IonFab,
  IonFabButton,
  IonIcon,
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonButton,
  IonInput,
  IonSpinner
} from '@ionic/vue'
import { addOutline } from 'ionicons/icons'
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
const showAddModal = ref(false)

async function handleAdd() {
  const title = newTitle.value.trim()
  if (!title) return
  await addTodo(title)
  newTitle.value = ''
  showAddModal.value = false
}
</script>

<template>
  <div>
    <!-- Error -->
    <p v-if="error" class="text-center text-red-400 text-sm py-2">{{ error }}</p>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-8">
      <ion-spinner name="crescent" color="primary" />
    </div>

    <!-- Empty state -->
    <div v-else-if="todos.length === 0" class="text-center py-12">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 mx-auto text-slate-600 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
        <path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
      <p class="text-slate-500 text-sm">Noch keine Aufgaben vorhanden</p>
    </div>

    <!-- Todo items -->
    <ion-list v-else lines="none" class="space-y-2">
      <TodoItem
        v-for="todo in todos"
        :key="todo.id"
        :todo="todo"
        :couple="couple"
        @toggle="toggleTodo"
        @assign="(id, to) => updateTodo(id, { assignedTo: to })"
        @delete="deleteTodo"
      />
    </ion-list>

    <!-- FAB to open add modal -->
    <ion-fab vertical="bottom" horizontal="end" slot="fixed" class="mb-2 mr-2">
      <ion-fab-button @click="showAddModal = true" color="primary">
        <ion-icon :icon="addOutline" />
      </ion-fab-button>
    </ion-fab>

    <!-- Add Todo Modal (bottom sheet) -->
    <ion-modal
      :is-open="showAddModal"
      :breakpoints="[0, 0.35]"
      :initial-breakpoint="0.35"
      @did-dismiss="showAddModal = false"
    >
      <ion-header>
        <ion-toolbar>
          <ion-title>Neue Aufgabe</ion-title>
          <ion-buttons slot="end">
            <ion-button @click="showAddModal = false">Fertig</ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>
      <ion-content class="ion-padding">
        <form @submit.prevent="handleAdd" class="space-y-4">
          <ion-input
            v-model="newTitle"
            placeholder="Aufgabe eingeben..."
            :clear-input="true"
            fill="outline"
            label="Aufgabe"
            label-placement="floating"
          />
          <ion-button
            expand="block"
            type="submit"
            :disabled="!newTitle.trim()"
          >
            Hinzufügen
          </ion-button>
        </form>
      </ion-content>
    </ion-modal>
  </div>
</template>

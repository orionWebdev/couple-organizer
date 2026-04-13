<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import {
  IonButton,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonSpinner
} from '@ionic/vue'
import { addOutline, closeOutline, ellipsisHorizontal, searchOutline } from 'ionicons/icons'
import { useAuth } from '@/composables/useAuth'
import { useTodos } from '@/composables/useTodos'
import type { Couple, Todo } from '@/types'
import AppSegmentToggle from '@/components/ui/AppSegmentToggle.vue'
import AppSheetModal from '@/components/ui/AppSheetModal.vue'
import TodoItem from './TodoItem.vue'
import TodoEditModal from './TodoEditModal.vue'

const props = defineProps<{
  coupleId: string
  couple: Couple | null
  createRequestKey?: number
}>()

const { user } = useAuth()
const coupleIdRef = computed<string | null>(() => props.coupleId)
const { todos, loading, error, addTodo, toggleTodo, updateTodo, deleteTodo } = useTodos(coupleIdRef)

const filterMode = ref<'all' | 'mine'>('all')
const searchQuery = ref('')
const showSearch = ref(false)
const newTitle = ref('')
const showAddModal = ref(false)
const showAssignModal = ref(false)
const showEditModal = ref(false)
const selectedTodo = ref<Todo | null>(null)

const quickAddTitle = ref('')
const quickAddInput = ref<HTMLInputElement | null>(null)

const filterOptions = [
  { label: 'Alle', value: 'all' },
  { label: 'Meine', value: 'mine' }
]

const visibleTodos = computed(() => {
  const normalizedQuery = searchQuery.value.trim().toLowerCase()

  return todos.value.filter((todo) => {
    const matchesMine = filterMode.value === 'all'
      || todo.assignedTo === user.value?.uid
      || (!todo.assignedTo && todo.createdBy === user.value?.uid)

    if (!matchesMine) return false
    if (!normalizedQuery) return true

    const assignee = todo.assignedTo ? props.couple?.memberNames[todo.assignedTo] || '' : ''
    return `${todo.title} ${assignee}`.toLowerCase().includes(normalizedQuery)
  })
})

async function handleAdd() {
  const title = newTitle.value.trim()
  if (!title) return
  await addTodo(title)
  newTitle.value = ''
  showAddModal.value = false
}

async function handleQuickAdd() {
  const title = quickAddTitle.value.trim()
  if (!title) return
  await addTodo(title)
  quickAddTitle.value = ''
  nextTick(() => quickAddInput.value?.focus())
}

function openAssignModal(todo: Todo) {
  selectedTodo.value = todo
  showAssignModal.value = true
}

async function assignTodo(assignedTo: string | null) {
  if (!selectedTodo.value) return
  await updateTodo(selectedTodo.value.id, { assignedTo })
  showAssignModal.value = false
  selectedTodo.value = null
}

function openEditModal(todo: Todo) {
  selectedTodo.value = todo
  showEditModal.value = true
}

function closeEditModal() {
  showEditModal.value = false
  selectedTodo.value = null
}

watch(() => props.createRequestKey, (next, previous) => {
  if (!next || next === previous) return
  showAddModal.value = true
})
</script>

<template>
  <section class="space-y-5 pb-4">
    <div class="todo-page-header">
      <h1 class="text-[2rem] font-semibold tracking-tight text-slate-50">Aufgaben</h1>
      <button
        type="button"
        class="todo-icon-button"
        :aria-label="showSearch ? 'Suche schließen' : 'Suche öffnen'"
        @click="showSearch = !showSearch"
      >
        <ion-icon :icon="showSearch ? closeOutline : searchOutline" class="text-xl" />
      </button>
    </div>

    <div v-if="showSearch" class="todo-search-card">
      <ion-input
        v-model="searchQuery"
        placeholder="Aufgaben durchsuchen"
        fill="outline"
        :clear-input="true"
      />
    </div>

    <AppSegmentToggle v-model="filterMode" :options="filterOptions" />

    <p v-if="error" class="text-center text-sm text-red-400">{{ error }}</p>

    <div v-if="loading" class="flex justify-center py-12">
      <ion-spinner name="crescent" color="primary" />
    </div>

    <div v-else-if="visibleTodos.length === 0" class="todo-empty-card">
      <p class="text-base font-medium text-slate-200">Keine Aufgaben gefunden</p>
      <p class="mt-2 text-sm text-slate-400">
        {{ filterMode === 'mine' ? 'Dir ist aktuell nichts zugewiesen.' : 'Lege deine erste Aufgabe an.' }}
      </p>
    </div>

    <section v-else class="todo-list-card">
      <ion-list lines="none" class="todo-list-shell">
        <TodoItem
          v-for="todo in visibleTodos"
          :key="todo.id"
          :todo="todo"
          :couple="couple"
          @toggle="toggleTodo"
          @assign-request="openAssignModal"
          @edit-request="openEditModal"
          @delete="deleteTodo"
        />
      </ion-list>
    </section>

    <!-- ── Inline quick-add ──────────────────────────────────── -->
    <form class="quick-add" @submit.prevent="handleQuickAdd">
      <input
        ref="quickAddInput"
        v-model="quickAddTitle"
        type="text"
        enterkeyhint="done"
        placeholder="Aufgabe hinzufügen…"
        class="quick-add-input"
      />
      <button
        type="button"
        class="quick-add-more"
        aria-label="Mit Details hinzufügen"
        @click="showAddModal = true"
      >
        <ion-icon :icon="ellipsisHorizontal" />
      </button>
      <button
        type="submit"
        class="quick-add-btn"
        :disabled="!quickAddTitle.trim()"
        aria-label="Aufgabe hinzufügen"
      >
        <ion-icon :icon="addOutline" />
      </button>
    </form>

    <AppSheetModal
      :is-open="showAddModal"
      title="Neue Aufgabe"
      :breakpoints="[0, 0.38, 0.54]"
      :initial-breakpoint="0.38"
      close-label="Fertig"
      @close="showAddModal = false"
    >
      <form @submit.prevent="handleAdd" class="space-y-4">
        <ion-input
          v-model="newTitle"
          placeholder="Aufgabe eingeben..."
          :clear-input="true"
          fill="outline"
          label="Aufgabe"
          label-placement="floating"
        />
        <ion-button expand="block" type="submit" :disabled="!newTitle.trim()">
          Hinzufügen
        </ion-button>
      </form>
    </AppSheetModal>

    <AppSheetModal
      :is-open="showAssignModal"
      title="Zuweisung"
      :breakpoints="[0, 0.42, 0.56]"
      :initial-breakpoint="0.42"
      close-label="Schließen"
      @close="showAssignModal = false"
    >
      <div class="space-y-3">
        <p class="text-sm text-slate-400">
          {{ selectedTodo?.title }}
        </p>
        <ion-list lines="none">
          <ion-item :button="true" :detail="false" @click="assignTodo(null)">
            <ion-label>Nicht zugewiesen</ion-label>
          </ion-item>
          <ion-item
            v-for="(name, uid) in couple?.memberNames || {}"
            :key="uid"
            :button="true"
            :detail="false"
            @click="assignTodo(uid)"
          >
            <ion-label>{{ name }}</ion-label>
          </ion-item>
        </ion-list>
      </div>
    </AppSheetModal>

    <TodoEditModal
      :is-open="showEditModal"
      :todo="selectedTodo"
      @close="closeEditModal"
      @update="(id, updates) => updateTodo(id, updates)"
      @toggle="toggleTodo"
      @delete="deleteTodo"
    />
  </section>
</template>

<style scoped>
.todo-page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding-top: 0.25rem;
}

.todo-icon-button {
  display: inline-flex;
  height: 3.25rem;
  width: 3.25rem;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(71, 85, 105, 0.55);
  border-radius: 9999px;
  background: linear-gradient(180deg, rgba(30, 41, 59, 0.96), rgba(15, 23, 42, 0.96));
  color: rgb(226 232 240);
  box-shadow: 0 14px 28px rgba(2, 6, 23, 0.16);
}

.todo-search-card {
  padding: 0.15rem 0;
}

.todo-empty-card,
.todo-list-card {
  border: 1px solid rgba(71, 85, 105, 0.5);
  border-radius: 1.9rem;
  background: linear-gradient(180deg, rgba(30, 41, 59, 0.97), rgba(15, 23, 42, 0.97));
  box-shadow: 0 18px 40px rgba(2, 6, 23, 0.24);
}

.todo-empty-card {
  padding: 2rem 1.4rem;
  text-align: center;
}

.todo-list-shell {
  background: transparent;
  padding: 1.15rem 1.2rem;
}

/* ── Quick-add ──────────────────────────────────────────────── */
.quick-add {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  border-radius: 1.25rem;
  background: rgba(15, 23, 42, 0.85);
  border: 1px solid rgba(71, 85, 105, 0.5);
}

.quick-add-input {
  flex: 1;
  min-width: 0;
  background: transparent;
  border: 0;
  outline: none;
  color: var(--app-text);
  font-family: var(--ion-font-family);
  font-size: 1.0625rem;
  padding: 0.65rem 0.75rem;
}

.quick-add-input::placeholder {
  color: var(--app-text-muted);
}

.quick-add-more,
.quick-add-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 9999px;
  border: 0;
  cursor: pointer;
  font-size: 1.25rem;
  flex-shrink: 0;
  -webkit-tap-highlight-color: transparent;
  transition: background 0.14s, color 0.14s, transform 0.1s;
}

.quick-add-more {
  background: rgba(71, 85, 105, 0.35);
  color: var(--app-text-muted);
}

.quick-add-more:active {
  background: rgba(71, 85, 105, 0.55);
}

.quick-add-btn {
  background: var(--app-primary);
  color: #fff;
}

.quick-add-btn:active:not(:disabled) {
  transform: scale(0.94);
  background: var(--app-primary-strong);
}

.quick-add-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
</style>

<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  IonButton,
  IonIcon,
  IonInput,
  IonList,
  IonSpinner,
  IonToggle
} from '@ionic/vue'
import {
  addOutline,
  closeOutline,
  searchOutline,
  checkmarkCircleOutline
} from 'ionicons/icons'
import { useAuth } from '@/composables/useAuth'
import { useTodos } from '@/composables/useTodos'
import type { Couple, Todo, TodoCategory } from '@/types'
import AppSheetModal from '@/components/ui/AppSheetModal.vue'
import AppFloatingActionButton from '@/components/ui/AppFloatingActionButton.vue'
import TaskItem from './TaskItem.vue'

const props = defineProps<{
  coupleId: string
  couple: Couple | null
}>()

const { user } = useAuth()
const coupleIdRef = computed<string | null>(() => props.coupleId)
const { todos, loading, error, addTodo, toggleTodo, updateTodo, deleteTodo } = useTodos(coupleIdRef)

// ── UI state ──────────────────────────────────────────────────────────────────
type FilterChip = 'alle' | 'meine' | 'heute' | 'wiederkehrend'
const activeFilter = ref<FilterChip>('alle')
const searchQuery = ref('')
const showSearch = ref(false)
const showAddModal = ref(false)
const showAssignModal = ref(false)
const selectedTodo = ref<Todo | null>(null)

// ── Add-form state ────────────────────────────────────────────────────────────
const newTitle = ref('')
const newCategory = ref<TodoCategory | null>(null)
const newDueDateStr = ref('')
const newAssignedTo = ref<string | null>(null)
const newRecurring = ref(false)

// ── Date helpers ──────────────────────────────────────────────────────────────
function startOfToday(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
}

type Group = 'overdue' | 'today' | 'tomorrow' | 'later' | 'recurring'

function getGroup(todo: Todo): Group {
  if (todo.recurring) return 'recurring'
  if (!todo.dueDate) return 'later'
  const due = todo.dueDate.toDate()
  const today = startOfToday()
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  if (due < today) return 'overdue'
  if (isSameDay(due, today)) return 'today'
  if (isSameDay(due, tomorrow)) return 'tomorrow'
  return 'later'
}

// ── Filtering ─────────────────────────────────────────────────────────────────
const activeTodos = computed(() => todos.value.filter((t) => !t.done))
const doneTodos  = computed(() => todos.value.filter((t) => t.done))

const filteredTodos = computed(() => {
  let list = activeTodos.value

  if (activeFilter.value === 'meine') {
    list = list.filter((t) =>
      t.assignedTo === user.value?.uid ||
      (!t.assignedTo && t.createdBy === user.value?.uid)
    )
  } else if (activeFilter.value === 'heute') {
    list = list.filter((t) => {
      if (t.recurring || !t.dueDate) return false
      return isSameDay(t.dueDate.toDate(), startOfToday())
    })
  } else if (activeFilter.value === 'wiederkehrend') {
    list = list.filter((t) => t.recurring)
  }

  if (searchQuery.value.trim()) {
    const q = searchQuery.value.trim().toLowerCase()
    list = list.filter((t) => t.title.toLowerCase().includes(q))
  }

  return list
})

// ── Grouping ──────────────────────────────────────────────────────────────────
interface Section {
  key: Group
  label: string
  dot: string
  todos: Todo[]
}

const sections = computed<Section[]>(() => {
  const groups: Record<Group, Todo[]> = {
    overdue: [], today: [], tomorrow: [], later: [], recurring: []
  }
  for (const todo of filteredTodos.value) {
    groups[getGroup(todo)].push(todo)
  }
  const result: Section[] = []
  if (groups.overdue.length)   result.push({ key: 'overdue',   label: 'Überfällig', dot: '#f87171', todos: groups.overdue })
  if (groups.today.length)     result.push({ key: 'today',     label: 'Heute',      dot: '#4ade80', todos: groups.today })
  if (groups.tomorrow.length)  result.push({ key: 'tomorrow',  label: 'Morgen',     dot: '#60a5fa', todos: groups.tomorrow })
  if (groups.later.length)     result.push({ key: 'later',     label: 'Später',     dot: '#475569', todos: groups.later })
  if (groups.recurring.length) result.push({ key: 'recurring', label: 'Routinen',   dot: '#c084fc', todos: groups.recurring })
  return result
})

// ── Stats ─────────────────────────────────────────────────────────────────────
const statsPerUser = computed(() => {
  if (!props.couple) return []
  return Object.entries(props.couple.memberNames).map(([uid, name]) => ({
    uid,
    name: name.split(' ')[0],
    count: doneTodos.value.filter(
      (t) => t.assignedTo === uid || (!t.assignedTo && t.createdBy === uid)
    ).length
  }))
})

// ── Actions ───────────────────────────────────────────────────────────────────
const CATEGORY_CONFIG: Record<TodoCategory, { label: string }> = {
  haushalt:  { label: 'Haushalt' },
  einkauf:   { label: 'Einkauf' },
  sonstiges: { label: 'Sonstiges' }
}

function toggleCategory(cat: TodoCategory) {
  newCategory.value = newCategory.value === cat ? null : cat
}

function resetForm() {
  newTitle.value = ''
  newCategory.value = null
  newDueDateStr.value = ''
  newAssignedTo.value = null
  newRecurring.value = false
}

async function handleAdd() {
  const title = newTitle.value.trim()
  if (!title) return
  const dueDate = newDueDateStr.value
    ? new Date(newDueDateStr.value + 'T00:00:00')
    : null
  await addTodo(title, {
    assignedTo: newAssignedTo.value,
    category: newCategory.value,
    dueDate,
    recurring: newRecurring.value
  })
  resetForm()
  showAddModal.value = false
}

function openAssignModal(todo: Todo) {
  selectedTodo.value = todo
  showAssignModal.value = true
}

async function assignTodo(uid: string | null) {
  if (!selectedTodo.value) return
  await updateTodo(selectedTodo.value.id, { assignedTo: uid })
  showAssignModal.value = false
  selectedTodo.value = null
}

function openAdd() {
  resetForm()
  showAddModal.value = true
}

// Today as YYYY-MM-DD for date input min attribute
const todayStr = new Date().toISOString().slice(0, 10)
</script>

<template>
  <section class="tasks-root">
    <!-- Header -->
    <div class="tasks-header">
      <h1 class="tasks-title">Aufgaben</h1>
      <button
        type="button"
        class="icon-btn"
        :aria-label="showSearch ? 'Suche schließen' : 'Suche öffnen'"
        @click="showSearch = !showSearch; if (!showSearch) searchQuery = ''"
      >
        <ion-icon :icon="showSearch ? closeOutline : searchOutline" />
      </button>
    </div>

    <!-- Search -->
    <Transition name="search-slide">
      <div v-if="showSearch" class="search-wrap">
        <ion-input
          v-model="searchQuery"
          placeholder="Aufgaben suchen…"
          fill="outline"
          :clear-input="true"
          autofocus
        />
      </div>
    </Transition>

    <!-- Filter chips -->
    <div class="chips-row">
      <button
        v-for="chip in ([
          { id: 'alle',          label: 'Alle' },
          { id: 'meine',         label: 'Meine' },
          { id: 'heute',         label: 'Heute' },
          { id: 'wiederkehrend', label: 'Wiederkehrend' }
        ] as const)"
        :key="chip.id"
        class="chip"
        :class="{ 'chip-active': activeFilter === chip.id }"
        @click="activeFilter = chip.id"
      >
        {{ chip.label }}
      </button>
    </div>

    <!-- Stats -->
    <div v-if="doneTodos.length > 0 && statsPerUser.length" class="stats-row">
      <div
        v-for="stat in statsPerUser"
        :key="stat.uid"
        class="stat-pill"
      >
        <ion-icon :icon="checkmarkCircleOutline" class="stat-icon" />
        <span class="stat-name">{{ stat.name }}</span>
        <span class="stat-count">{{ stat.count }}</span>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="center-spinner">
      <ion-spinner name="crescent" color="primary" />
    </div>

    <!-- Error -->
    <p v-else-if="error" class="error-text">{{ error }}</p>

    <!-- Empty -->
    <div
      v-else-if="filteredTodos.length === 0 && !loading"
      class="empty-card"
    >
      <p class="empty-title">Keine Aufgaben</p>
      <p class="empty-sub">
        {{
          activeFilter === 'heute'          ? 'Heute ist nichts fällig.' :
          activeFilter === 'meine'          ? 'Dir ist nichts zugewiesen.' :
          activeFilter === 'wiederkehrend'  ? 'Keine Routinen angelegt.' :
          'Lege deine erste Aufgabe an.'
        }}
      </p>
    </div>

    <!-- Grouped list -->
    <div v-else class="sections">
      <div
        v-for="section in sections"
        :key="section.key"
        class="section"
      >
        <!-- Section header -->
        <div class="section-header">
          <span class="section-dot" :style="{ background: section.dot }" />
          <span class="section-label">{{ section.label }}</span>
          <span class="section-count">{{ section.todos.length }}</span>
        </div>

        <!-- Task cards -->
        <div class="task-card">
          <ion-list lines="none" class="task-list">
            <TaskItem
              v-for="todo in section.todos"
              :key="todo.id"
              :todo="todo"
              :couple="couple"
              @toggle="toggleTodo"
              @assign-request="openAssignModal"
              @delete="deleteTodo"
            />
          </ion-list>
        </div>
      </div>
    </div>

    <!-- FAB -->
    <AppFloatingActionButton :icon="addOutline" aria-label="Aufgabe hinzufügen" @click="openAdd" />

    <!-- ─── Add task sheet ──────────────────────────────────────────────── -->
    <AppSheetModal
      :is-open="showAddModal"
      title="Neue Aufgabe"
      :breakpoints="[0, 0.72, 0.9]"
      :initial-breakpoint="0.72"
      close-label="Abbrechen"
      @close="showAddModal = false"
    >
      <form class="add-form" @submit.prevent="handleAdd">
        <!-- Title -->
        <ion-input
          v-model="newTitle"
          placeholder="Was muss gemacht werden?"
          fill="outline"
          label="Aufgabe"
          label-placement="floating"
          :clear-input="true"
          autofocus
        />

        <!-- Category -->
        <div class="form-section">
          <p class="form-label">Kategorie</p>
          <div class="cat-chips">
            <button
              v-for="(cfg, cat) in CATEGORY_CONFIG"
              :key="cat"
              type="button"
              class="cat-btn"
              :class="[`cat-btn-${cat}`, { 'cat-btn-active': newCategory === cat }]"
              @click="toggleCategory(cat as TodoCategory)"
            >
              {{ cfg.label }}
            </button>
          </div>
        </div>

        <!-- Due date -->
        <div class="form-section">
          <p class="form-label">Fälligkeitsdatum <span class="form-optional">(optional)</span></p>
          <input
            v-model="newDueDateStr"
            type="date"
            class="date-input"
            :min="todayStr"
          />
        </div>

        <!-- Recurring -->
        <div class="form-row">
          <div>
            <p class="form-label" style="margin-bottom:0">Wiederkehrend</p>
            <p class="form-sub">Als Routine markieren</p>
          </div>
          <ion-toggle
            :checked="newRecurring"
            color="primary"
            @ion-change="newRecurring = $event.detail.checked"
          />
        </div>

        <!-- Assign to -->
        <div class="form-section">
          <p class="form-label">Zuweisen an</p>
          <div class="assign-chips">
            <button
              type="button"
              class="assign-btn"
              :class="{ 'assign-btn-active': newAssignedTo === null }"
              @click="newAssignedTo = null"
            >
              Niemand
            </button>
            <button
              v-for="(name, uid) in couple?.memberNames"
              :key="uid"
              type="button"
              class="assign-btn"
              :class="{ 'assign-btn-active': newAssignedTo === uid }"
              @click="newAssignedTo = uid"
            >
              {{ name.split(' ')[0] }}
            </button>
          </div>
        </div>

        <ion-button expand="block" type="submit" :disabled="!newTitle.trim()">
          Hinzufügen
        </ion-button>
      </form>
    </AppSheetModal>

    <!-- ─── Assign modal ───────────────────────────────────────────────── -->
    <AppSheetModal
      :is-open="showAssignModal"
      title="Zuweisung"
      :breakpoints="[0, 0.45]"
      :initial-breakpoint="0.45"
      close-label="Schließen"
      @close="showAssignModal = false"
    >
      <div class="space-y-3">
        <p class="text-sm text-slate-400">{{ selectedTodo?.title }}</p>
        <div class="assign-chips">
          <button
            type="button"
            class="assign-btn"
            @click="assignTodo(null)"
          >Nicht zugewiesen</button>
          <button
            v-for="(name, uid) in couple?.memberNames"
            :key="uid"
            type="button"
            class="assign-btn"
            @click="assignTodo(uid)"
          >
            {{ name.split(' ')[0] }}
          </button>
        </div>
      </div>
    </AppSheetModal>
  </section>
</template>

<style scoped>
/* ── Root ──────────────────────────────────────────────────────────────── */
.tasks-root {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding-bottom: 5rem;
}

/* ── Header ────────────────────────────────────────────────────────────── */
.tasks-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 0.5rem;
}

.tasks-title {
  font-size: 2.25rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: #f8fafc;
  margin: 0;
}

.icon-btn {
  display: inline-flex;
  height: 2.75rem;
  width: 2.75rem;
  align-items: center;
  justify-content: center;
  border-radius: 9999px;
  border: 1px solid rgba(71, 85, 105, 0.5);
  background: linear-gradient(180deg, rgba(30, 41, 59, 0.96), rgba(15, 23, 42, 0.96));
  color: #cbd5e1;
  font-size: 1.5rem;
  flex-shrink: 0;
}

/* ── Search ────────────────────────────────────────────────────────────── */
.search-wrap {
  overflow: hidden;
}

.search-slide-enter-active,
.search-slide-leave-active {
  transition: max-height 0.25s ease, opacity 0.2s ease;
  max-height: 5rem;
}

.search-slide-enter-from,
.search-slide-leave-to {
  max-height: 0;
  opacity: 0;
}

/* ── Filter chips ──────────────────────────────────────────────────────── */
.chips-row {
  display: flex;
  gap: 0.5rem;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  padding-bottom: 2px;
  scrollbar-width: none;
}

.chips-row::-webkit-scrollbar {
  display: none;
}

.chip {
  flex-shrink: 0;
  padding: 0.4rem 0.875rem;
  border-radius: 9999px;
  border: 1px solid rgba(71, 85, 105, 0.5);
  background: rgba(30, 41, 59, 0.7);
  color: #94a3b8;
  font-size: 1.125rem;
  font-weight: 600;
  white-space: nowrap;
  transition: background 0.18s, border-color 0.18s, color 0.18s;
}

.chip-active {
  background: rgba(34, 197, 94, 0.15);
  border-color: rgba(34, 197, 94, 0.45);
  color: #4ade80;
}

/* ── Stats ─────────────────────────────────────────────────────────────── */
.stats-row {
  display: flex;
  gap: 0.75rem;
}

.stat-pill {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.45rem 0.875rem;
  border-radius: 9999px;
  background: rgba(30, 41, 59, 0.8);
  border: 1px solid rgba(71, 85, 105, 0.45);
  flex: 1;
}

.stat-icon {
  color: #4ade80;
  font-size: 1.25rem;
}

.stat-name {
  font-size: 1.07rem;
  color: #94a3b8;
  font-weight: 500;
}

.stat-count {
  margin-left: auto;
  font-size: 1.25rem;
  font-weight: 700;
  color: #f8fafc;
}

/* ── Spinner / Empty ───────────────────────────────────────────────────── */
.center-spinner {
  display: flex;
  justify-content: center;
  padding: 3rem 0;
}

.error-text {
  text-align: center;
  font-size: 1.125rem;
  color: #f87171;
}

.empty-card {
  padding: 2.5rem 1.5rem;
  text-align: center;
  border: 1px solid rgba(71, 85, 105, 0.45);
  border-radius: 1.5rem;
  background: linear-gradient(180deg, rgba(30, 41, 59, 0.95), rgba(15, 23, 42, 0.95));
}

.empty-title {
  font-size: 1.3rem;
  font-weight: 600;
  color: #e2e8f0;
  margin: 0 0 0.375rem;
}

.empty-sub {
  font-size: 1.125rem;
  color: #64748b;
  margin: 0;
}

/* ── Sections ──────────────────────────────────────────────────────────── */
.sections {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0 0.25rem;
}

.section-dot {
  width: 7px;
  height: 7px;
  border-radius: 9999px;
  flex-shrink: 0;
}

.section-label {
  font-size: 1rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #64748b;
}

.section-count {
  margin-left: auto;
  font-size: 1rem;
  font-weight: 600;
  color: #475569;
  background: rgba(71, 85, 105, 0.25);
  padding: 1px 7px;
  border-radius: 9999px;
}

.task-card {
  border: 1px solid rgba(71, 85, 105, 0.45);
  border-radius: 1.5rem;
  background: linear-gradient(180deg, rgba(30, 41, 59, 0.97), rgba(15, 23, 42, 0.97));
  overflow: hidden;
}

.task-list {
  background: transparent;
  padding: 0.5rem 1rem;
}

/* ── Add form ──────────────────────────────────────────────────────────── */
.add-form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.form-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-label {
  font-size: 1rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: #64748b;
  margin: 0;
}

.form-optional {
  font-weight: 400;
  text-transform: none;
  letter-spacing: 0;
}

.form-sub {
  font-size: 1.03rem;
  color: #475569;
  margin: 0.15rem 0 0;
}

.form-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.75rem 1rem;
  background: var(--input-bg);
  border: 1.5px solid var(--input-border);
  border-radius: var(--input-radius);
  transition: var(--input-transition);
}

/* Category chips */
.cat-chips {
  display: flex;
  gap: 0.5rem;
}

.cat-btn {
  flex: 1;
  padding: 0.5rem 0;
  border-radius: 0.75rem;
  border: 1px solid rgba(71, 85, 105, 0.5);
  background: rgba(30, 41, 59, 0.7);
  color: #64748b;
  font-size: 1.07rem;
  font-weight: 600;
  transition: all 0.18s ease;
}

.cat-btn-haushalt.cat-btn-active {
  background: rgba(99, 102, 241, 0.15);
  border-color: rgba(99, 102, 241, 0.5);
  color: #a5b4fc;
}

.cat-btn-einkauf.cat-btn-active {
  background: rgba(34, 197, 94, 0.12);
  border-color: rgba(34, 197, 94, 0.4);
  color: #4ade80;
}

.cat-btn-sonstiges.cat-btn-active {
  background: rgba(100, 116, 139, 0.18);
  border-color: rgba(100, 116, 139, 0.45);
  color: #94a3b8;
}

/* Date input */
.date-input {
  width: 100%;
  padding: 0.75rem 1rem;
  border-radius: var(--input-radius);
  border: 1.5px solid var(--input-border);
  background: var(--input-bg);
  color: var(--app-text);
  font-family: var(--ion-font-family);
  font-size: 1.1875rem;
  color-scheme: dark;
  outline: none;
  box-sizing: border-box;
  transition: var(--input-transition);
  -webkit-appearance: none;
  appearance: none;
}

.date-input:hover:not(:focus) {
  border-color: var(--input-border-hover);
  background: var(--input-bg-hover);
}

.date-input:focus {
  border-color: var(--input-border-focus);
  box-shadow: 0 0 0 3px var(--input-glow);
  background: var(--input-bg-focus);
}

/* Assign chips */
.assign-chips {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.assign-btn {
  padding: 0.45rem 1rem;
  border-radius: 9999px;
  border: 1px solid rgba(71, 85, 105, 0.5);
  background: rgba(30, 41, 59, 0.7);
  color: #94a3b8;
  font-size: 1.125rem;
  font-weight: 600;
  transition: all 0.18s ease;
}

.assign-btn-active {
  background: rgba(34, 197, 94, 0.15);
  border-color: rgba(34, 197, 94, 0.5);
  color: #4ade80;
}
</style>

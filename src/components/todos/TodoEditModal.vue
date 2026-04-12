<script setup lang="ts">
import { ref, watch } from 'vue'
import { IonInput, IonButton, IonIcon } from '@ionic/vue'
import { trashOutline } from 'ionicons/icons'
import AppSheetModal from '@/components/ui/AppSheetModal.vue'
import type { Todo, TodoCategory } from '@/types'

const CATEGORIES: { value: TodoCategory; label: string; emoji: string }[] = [
  { value: 'haushalt',  label: 'Haushalt',  emoji: '🏠' },
  { value: 'einkauf',   label: 'Einkauf',   emoji: '🛒' },
  { value: 'sonstiges', label: 'Sonstiges', emoji: '✨' }
]

const props = defineProps<{
  isOpen: boolean
  todo: Todo | null
}>()

const emit = defineEmits<{
  close: []
  update: [id: string, updates: { title?: string; category?: TodoCategory | null }]
  toggle: [id: string, done: boolean]
  delete: [id: string]
}>()

const title = ref('')
const category = ref<TodoCategory | null>(null)
const done = ref(false)

watch(() => props.isOpen, (open) => {
  if (!open || !props.todo) return
  title.value = props.todo.title
  category.value = props.todo.category
  done.value = props.todo.done
})

function handleSave() {
  if (!props.todo) return
  const cleanTitle = title.value.trim()
  if (!cleanTitle) return

  const updates: { title?: string; category?: TodoCategory | null } = {}
  if (cleanTitle !== props.todo.title) updates.title = cleanTitle
  if (category.value !== props.todo.category) updates.category = category.value

  if (Object.keys(updates).length > 0) {
    emit('update', props.todo.id, updates)
  }
  if (done.value !== props.todo.done) {
    emit('toggle', props.todo.id, done.value)
  }
  emit('close')
}

function handleDelete() {
  if (!props.todo) return
  emit('delete', props.todo.id)
  emit('close')
}

function selectCategory(value: TodoCategory) {
  category.value = category.value === value ? null : value
}
</script>

<template>
  <AppSheetModal
    :is-open="isOpen"
    title="Aufgabe bearbeiten"
    :breakpoints="[0, 0.55, 0.85]"
    :initial-breakpoint="0.55"
    close-label="Abbrechen"
    @close="emit('close')"
  >
    <form v-if="todo" @submit.prevent="handleSave" class="space-y-5">
      <!-- Title -->
      <ion-input
        v-model="title"
        label="Titel"
        label-placement="floating"
        fill="outline"
        :clear-input="true"
      />

      <!-- Category chips -->
      <div class="edit-field">
        <span class="edit-label">Kategorie</span>
        <div class="cat-chips">
          <button
            v-for="cat in CATEGORIES"
            :key="cat.value"
            type="button"
            class="cat-chip"
            :class="{ 'cat-chip--active': category === cat.value }"
            @click="selectCategory(cat.value)"
          >
            <span class="cat-chip-emoji" aria-hidden="true">{{ cat.emoji }}</span>
            {{ cat.label }}
          </button>
        </div>
      </div>

      <!-- Done toggle -->
      <button
        type="button"
        class="done-toggle"
        :class="{ 'done-toggle--active': done }"
        @click="done = !done"
      >
        <span class="done-check" :class="{ 'done-check--active': done }">
          <svg v-if="done" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M5 13l4 4L19 7" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </span>
        <span class="done-label">{{ done ? 'Erledigt' : 'Als erledigt markieren' }}</span>
      </button>

      <!-- Actions -->
      <div class="actions-row">
        <ion-button
          type="button"
          fill="clear"
          color="danger"
          class="delete-btn"
          @click="handleDelete"
        >
          <ion-icon :icon="trashOutline" slot="start" />
          Löschen
        </ion-button>
        <ion-button
          expand="block"
          type="submit"
          :disabled="!title.trim()"
          class="save-btn"
        >
          Speichern
        </ion-button>
      </div>
    </form>
  </AppSheetModal>
</template>

<style scoped>
.space-y-5 > * + * { margin-top: 1.25rem; }

.edit-field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.edit-label {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--app-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.07em;
}

/* Category chips */
.cat-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
}

.cat-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.45rem 0.9rem;
  border-radius: 9999px;
  border: 1px solid rgba(71, 85, 105, 0.7);
  background: transparent;
  color: var(--app-text-muted);
  font-family: var(--ion-font-family);
  font-size: 1.05rem;
  font-weight: 600;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: all 0.14s;
}

.cat-chip:active {
  transform: scale(0.97);
}

.cat-chip--active {
  background: rgba(var(--app-primary-rgb), 0.16);
  border-color: rgba(var(--app-primary-rgb), 0.55);
  color: var(--app-primary-tint);
}

.cat-chip-emoji {
  font-size: 1.05rem;
}

/* Done toggle button */
.done-toggle {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  padding: 0.875rem 1rem;
  border-radius: 1rem;
  border: 1px solid rgba(71, 85, 105, 0.7);
  background: rgba(30, 41, 59, 0.6);
  color: var(--app-text);
  font-family: var(--ion-font-family);
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: background 0.14s, border-color 0.14s;
}

.done-toggle:active {
  transform: scale(0.99);
}

.done-toggle--active {
  background: rgba(var(--app-success-rgb), 0.14);
  border-color: rgba(var(--app-success-rgb), 0.5);
}

.done-check {
  width: 1.8rem;
  height: 1.8rem;
  border-radius: 9999px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid rgba(71, 85, 105, 0.88);
  color: #fff;
}

.done-check--active {
  background: var(--app-success);
  border-color: var(--app-success);
}

.done-check svg { width: 1rem; height: 1rem; }

.done-label { flex: 1; text-align: left; }

/* Actions */
.actions-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding-top: 0.25rem;
}

.delete-btn { flex-shrink: 0; }
.save-btn { flex: 1; }
</style>

<script setup lang="ts">
import { computed } from 'vue'
import {
  IonIcon,
  IonItem,
  IonItemOption,
  IonItemOptions,
  IonItemSliding,
  IonLabel
} from '@ionic/vue'
import { checkmarkOutline, trashOutline } from 'ionicons/icons'
import type { Couple, Todo, TodoCategory } from '@/types'
import OverviewAvatar from '@/components/overview/OverviewAvatar.vue'

const props = defineProps<{
  todo: Todo
  couple: Couple | null
}>()

const emit = defineEmits<{
  toggle: [id: string, done: boolean]
  assignRequest: [todo: Todo]
  delete: [id: string]
}>()

const CATEGORY_CONFIG: Record<TodoCategory, { label: string; cls: string }> = {
  haushalt: { label: 'Haushalt', cls: 'cat-haushalt' },
  einkauf:  { label: 'Einkauf',  cls: 'cat-einkauf' },
  sonstiges: { label: 'Sonstiges', cls: 'cat-sonstiges' }
}

const categoryInfo = computed(() =>
  props.todo.category ? CATEGORY_CONFIG[props.todo.category] : null
)

const assigneeName = computed(() => {
  if (!props.todo.assignedTo) return 'Offen'
  return props.couple?.memberNames[props.todo.assignedTo] || 'Offen'
})

const assigneeTone = computed<'green' | 'blue' | 'amber' | 'rose'>(() => {
  if (!props.todo.assignedTo || !props.couple) return 'green'
  const idx = props.couple.memberIds.indexOf(props.todo.assignedTo)
  return (['green', 'blue', 'amber', 'rose'] as const)[idx % 4] ?? 'green'
})

const secondaryText = computed(() => {
  if (props.todo.done) return 'Erledigt'
  if (props.todo.recurring) return 'Routine'
  if (props.todo.dueDate) {
    const due = props.todo.dueDate.toDate()
    return `Fällig ${due.toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })}`
  }
  if (props.todo.assignedTo) {
    return `→ ${props.couple?.memberNames[props.todo.assignedTo] ?? 'jemand'}`
  }
  return 'Nicht zugewiesen'
})
</script>

<template>
  <ion-item-sliding class="task-row">
    <!-- Swipe right → complete -->
    <ion-item-options side="start">
      <ion-item-option
        class="opt-complete"
        expandable
        @click="emit('toggle', todo.id, !todo.done)"
      >
        <ion-icon :icon="checkmarkOutline" slot="top" />
        {{ todo.done ? 'Offen' : 'Fertig' }}
      </ion-item-option>
    </ion-item-options>

    <!-- Main row -->
    <ion-item lines="none" class="task-item" :class="{ 'task-done': todo.done }">
      <!-- Tap-to-toggle circle -->
      <button
        slot="start"
        type="button"
        class="check-wrap"
        :aria-label="todo.done ? 'Als offen markieren' : 'Als erledigt markieren'"
        @click="emit('toggle', todo.id, !todo.done)"
      >
        <div class="check-ring" :class="{ 'check-ring-done': todo.done }">
          <ion-icon v-if="todo.done" :icon="checkmarkOutline" class="check-icon" />
        </div>
      </button>

      <ion-label class="task-label">
        <p class="task-title" :class="{ 'task-title-done': todo.done }">{{ todo.title }}</p>
        <div class="task-meta">
          <span v-if="categoryInfo" class="cat-chip" :class="categoryInfo.cls">
            {{ categoryInfo.label }}
          </span>
          <span v-if="todo.recurring && !categoryInfo" class="cat-chip cat-routine">Routine</span>
          <span class="task-sub">{{ secondaryText }}</span>
        </div>
      </ion-label>

      <!-- Assignee avatar -->
      <button
        slot="end"
        type="button"
        class="avatar-btn"
        aria-label="Zuweisung bearbeiten"
        @click.stop="emit('assignRequest', todo)"
      >
        <OverviewAvatar :name="assigneeName" :tone="assigneeTone" size="sm" />
      </button>
    </ion-item>

    <!-- Swipe left → delete -->
    <ion-item-options side="end">
      <ion-item-option
        color="danger"
        expandable
        @click="emit('delete', todo.id)"
      >
        <ion-icon :icon="trashOutline" slot="top" />
        Löschen
      </ion-item-option>
    </ion-item-options>
  </ion-item-sliding>
</template>

<style scoped>
.task-row {
  margin: 0;
}

.task-item {
  --background: transparent;
  --padding-start: 0;
  --padding-end: 0;
  --inner-padding-end: 0;
  --min-height: 5rem;
  transition: opacity 0.2s ease;
}

.task-item::part(native) {
  border: 0;
  background: transparent;
  box-shadow: none;
  border-radius: 0;
}

.task-done {
  opacity: 0.55;
}

/* Swipe option: complete */
.opt-complete {
  --background: #16a34a;
  --color: #fff;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* Check ring */
.check-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 0.875rem;
  background: transparent;
  border: 0;
  padding: 0;
  flex-shrink: 0;
}

.check-ring {
  position: relative;
  display: flex;
  height: 2rem;
  width: 2rem;
  align-items: center;
  justify-content: center;
  border: 2px solid rgba(148, 163, 184, 0.5);
  border-radius: 9999px;
  transition: border-color 0.22s ease, background 0.22s ease;
}

.check-ring-done {
  border-color: #4ade80;
  background: #4ade80;
}

.check-icon {
  color: #fff;
  font-size: 1rem;
  position: absolute;
}

/* Label */
.task-label {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.task-title {
  margin: 0;
  color: rgb(248 250 252);
  font-size: 1rem;
  font-weight: 600;
  line-height: 1.35;
  transition: color 0.2s, text-decoration 0.2s;
}

.task-title-done {
  color: rgb(100 116 139);
  text-decoration: line-through;
}

.task-meta {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-wrap: wrap;
}

.task-sub {
  font-size: 0.8rem;
  color: rgb(100 116 139);
}

/* Category chips */
.cat-chip {
  display: inline-flex;
  align-items: center;
  padding: 1px 7px;
  border-radius: 999px;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  border: 1px solid transparent;
}

.cat-haushalt {
  background: rgba(99, 102, 241, 0.15);
  border-color: rgba(99, 102, 241, 0.35);
  color: #a5b4fc;
}

.cat-einkauf {
  background: rgba(34, 197, 94, 0.12);
  border-color: rgba(34, 197, 94, 0.3);
  color: #86efac;
}

.cat-sonstiges {
  background: rgba(100, 116, 139, 0.2);
  border-color: rgba(100, 116, 139, 0.35);
  color: #94a3b8;
}

.cat-routine {
  background: rgba(168, 85, 247, 0.12);
  border-color: rgba(168, 85, 247, 0.3);
  color: #d8b4fe;
}

/* Avatar */
.avatar-btn {
  background: transparent;
  border: 0;
  padding: 0;
  padding-left: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  min-width: 2.75rem;
  flex-shrink: 0;
}
</style>

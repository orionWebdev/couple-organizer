<script setup lang="ts">
import { computed } from 'vue'
import {
  IonCheckbox,
  IonIcon,
  IonItem,
  IonItemOption,
  IonItemOptions,
  IonItemSliding,
  IonLabel
} from '@ionic/vue'
import { checkmarkOutline } from 'ionicons/icons'
import type { Couple, Todo } from '@/types'
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

const visibleMembers = computed(() => {
  if (!props.couple) return []

  const orderedIds = [props.todo.assignedTo, props.todo.createdBy]
    .filter((uid): uid is string => Boolean(uid))
    .filter((uid, index, array) => array.indexOf(uid) === index)

  return orderedIds.slice(0, 2).map((uid, index) => ({
    uid,
    name: props.couple?.memberNames[uid] || 'Unbekannt',
    tone: getTone(index)
  }))
})

const secondaryText = computed(() => {
  if (props.todo.done) {
    return 'Erledigt'
  }

  if (props.todo.assignedTo) {
    return `Zugewiesen an ${props.couple?.memberNames[props.todo.assignedTo] || 'jemanden'}`
  }

  return 'Nicht zugewiesen'
})

function getTone(index: number): 'green' | 'blue' | 'amber' | 'rose' {
  return ['green', 'blue', 'amber', 'rose'][index % 4] as 'green' | 'blue' | 'amber' | 'rose'
}
</script>

<template>
  <ion-item-sliding class="todo-feed-row">
    <ion-item lines="none" class="todo-feed-item" :class="{ 'todo-feed-item-done': todo.done }">
      <div slot="start" class="todo-checkbox-shell">
        <div class="todo-checkbox-ring" :class="{ 'todo-checkbox-ring-done': todo.done }">
          <ion-checkbox
            :checked="todo.done"
            aria-label="Aufgabe erledigt"
            @ion-change="emit('toggle', todo.id, $event.detail.checked)"
          />
          <ion-icon v-if="todo.done" :icon="checkmarkOutline" class="todo-check-icon" />
        </div>
      </div>

      <ion-label class="todo-content">
        <h3 class="todo-title" :class="{ 'todo-title-done': todo.done }">{{ todo.title }}</h3>
        <p class="todo-subtitle" :class="{ 'todo-subtitle-done': todo.done }">{{ secondaryText }}</p>
      </ion-label>

      <button
        slot="end"
        type="button"
        class="todo-assignee-button"
        aria-label="Zuweisung bearbeiten"
        @click.stop="emit('assignRequest', todo)"
      >
        <div v-if="visibleMembers.length > 1" class="todo-avatar-stack">
          <OverviewAvatar
            v-for="member in visibleMembers"
            :key="member.uid"
            :name="member.name"
            :tone="member.tone"
            size="sm"
          />
        </div>
        <OverviewAvatar
          v-else
          :name="visibleMembers[0]?.name || 'Offen'"
          :tone="visibleMembers[0]?.tone || 'green'"
          size="sm"
        />
      </button>
    </ion-item>

    <ion-item-options side="end">
      <ion-item-option color="danger" expandable @click="emit('delete', todo.id)">
        Löschen
      </ion-item-option>
    </ion-item-options>
  </ion-item-sliding>
</template>

<style scoped>
.todo-feed-row {
  margin: 0;
}

.todo-feed-item {
  --background: transparent;
  --padding-start: 0;
  --padding-end: 0;
  --inner-padding-end: 0;
  --min-height: 4.85rem;
}

.todo-feed-item::part(native) {
  border: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}

.todo-checkbox-shell {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 0.9rem;
}

.todo-checkbox-ring {
  position: relative;
  display: flex;
  height: 2rem;
  width: 2rem;
  align-items: center;
  justify-content: center;
  border: 2px solid rgba(191, 219, 254, 0.75);
  border-radius: 9999px;
}

.todo-checkbox-ring-done {
  border-color: rgb(74 222 128);
  background: rgb(74 222 128);
}

.todo-checkbox-ring :deep(ion-checkbox) {
  --size: 1.6rem;
  --border-width: 0;
  --checkbox-background: transparent;
  --checkbox-background-checked: transparent;
  opacity: 0;
  position: absolute;
  inset: 0;
}

.todo-check-icon {
  color: white;
  font-size: 1rem;
}

.todo-content {
  margin: 0;
}

.todo-title {
  margin: 0;
  color: rgb(248 250 252);
  font-size: 1.12rem;
  font-weight: 600;
  line-height: 1.3;
}

.todo-title-done {
  color: rgb(100 116 139);
  text-decoration: line-through;
}

.todo-subtitle {
  margin-top: 0.35rem;
  color: rgb(148 163 184);
  font-size: 0.92rem;
}

.todo-subtitle-done {
  color: rgb(100 116 139);
}

.todo-assignee-button {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  min-width: 2.8rem;
  padding-left: 0.75rem;
  background: transparent;
  border: 0;
}

.todo-avatar-stack {
  display: flex;
  align-items: center;
}

.todo-avatar-stack :deep(.inline-flex) {
  margin-left: -0.45rem;
  box-shadow: 0 0 0 2px rgba(15, 23, 42, 0.88);
}

.todo-avatar-stack :deep(.inline-flex:first-child) {
  margin-left: 0;
}
</style>

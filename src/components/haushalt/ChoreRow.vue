<script setup lang="ts">
import { computed } from 'vue'
import type { Todo, Couple } from '@/types'
import InitialChip from '@/components/ui/InitialChip.vue'

const props = defineProps<{
  todo: Todo
  couple: Couple | null
}>()

const emit = defineEmits<{
  toggle: [id: string, done: boolean]
  delete: [id: string]
}>()

const dueDateLabel = computed(() => {
  if (!props.todo.dueDate) return null
  const date = (props.todo.dueDate as any).toDate?.() ?? new Date()
  return new Intl.DateTimeFormat('de-DE', { weekday: 'short', day: 'numeric', month: 'short' }).format(date)
})
</script>

<template>
  <div class="chore-row" :class="{ 'chore-row--done': todo.done }">
    <button
      class="checkbox"
      :class="{ 'checkbox--checked': todo.done }"
      @click="emit('toggle', todo.id, !todo.done)"
    >
      <svg v-if="todo.done" width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M2 7l4 4 6-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </button>

    <div class="chore-text">
      <span class="chore-title">{{ todo.title }}</span>
      <span v-if="dueDateLabel" class="chore-due">Fällig · {{ dueDateLabel }}</span>
    </div>

    <InitialChip
      v-if="todo.assignedTo"
      :uid="todo.assignedTo"
      :couple="couple"
      :size="24"
    />
    <div v-else class="unassigned-chip">?</div>

    <div class="row-divider" />
  </div>
</template>

<style scoped>
.chore-row {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 13px var(--screen-pad);
  min-height: 56px;
  cursor: pointer;
}

.chore-row--done .chore-title {
  color: var(--text-meta);
  text-decoration: line-through;
}

.checkbox {
  width: 30px;
  height: 30px;
  border-radius: 9px;
  border: 1.5px solid var(--border);
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  cursor: pointer;
  transition: all 0.15s ease;
  color: #14110d;
}

.checkbox--checked {
  background: var(--accent);
  border-color: var(--accent);
}

.chore-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.chore-title {
  font-size: 15px;
  font-weight: 500;
  color: var(--text);
  transition: color 0.15s ease;
}

.chore-due {
  font-size: 11.5px;
  color: var(--text-meta);
}

.unassigned-chip {
  width: 24px;
  height: 24px;
  border-radius: 7px;
  border: 1px dashed var(--text-faint);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: var(--accent);
  flex-shrink: 0;
}

.row-divider {
  position: absolute;
  bottom: 0;
  left: var(--screen-pad);
  right: var(--screen-pad);
  height: 1px;
  background: var(--border-softer);
}
</style>

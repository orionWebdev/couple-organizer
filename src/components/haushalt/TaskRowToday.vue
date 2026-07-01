<script setup lang="ts">
import { computed } from 'vue'
import type { Chore, ChoreAssignee, Couple } from '@/types'
import TaskAbhakControl from './TaskAbhakControl.vue'
import { isDoneToday, metaLine, recurLabel } from '@/utils/chores'

const props = withDefaults(defineProps<{
  chore: Chore
  couple: Couple | null
  todayCount?: number
}>(), { todayCount: 0 })

const emit = defineEmits<{
  pick: [assignee: ChoreAssignee]
  undo: []
}>()

// Only one-off chores get struck through; recurring ones can be done again.
const struck = computed(() => props.chore.type === 'once' && isDoneToday(props.chore))
</script>

<template>
  <div class="row list-row">
    <TaskAbhakControl :chore="chore" :couple="couple" :todayCount="todayCount" @pick="emit('pick', $event)" @undo="emit('undo')" />
    <div class="row-text">
      <span class="row-name" :class="{ 'row-name--done': struck }">{{ chore.name }}</span>
      <span class="row-meta">{{ metaLine(chore, couple, todayCount) }}</span>
    </div>
    <span class="row-recur">{{ recurLabel(chore) }}</span>
  </div>
</template>

<style scoped>
.row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 13px 0;
  border-bottom: 1px solid var(--border-softer);
}

.row-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.row-name {
  font-size: 15px;
  font-weight: 500;
  color: var(--text);
  transition: color var(--dur-base) var(--ease-standard);
}

.row-name--done {
  color: #6f665d;
  text-decoration: line-through;
}

.row-meta {
  font-size: 11.5px;
  color: var(--text-meta);
}

.row-recur {
  font-size: 10.5px;
  color: var(--text-faint);
  flex-shrink: 0;
  text-align: right;
  max-width: 70px;
}
</style>

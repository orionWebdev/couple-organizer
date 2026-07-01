<script setup lang="ts">
import { computed } from 'vue'
import type { Chore, ChoreAssignee, Couple } from '@/types'
import TaskAbhakControl from './TaskAbhakControl.vue'
import { isDoneToday, metaLine, recurLabel } from '@/utils/chores'

const props = defineProps<{
  chore: Chore
  couple: Couple | null
}>()

const emit = defineEmits<{
  pick: [assignee: ChoreAssignee]
  undo: []
}>()

const done = computed(() => isDoneToday(props.chore))
</script>

<template>
  <div class="row">
    <TaskAbhakControl :chore="chore" :couple="couple" @pick="emit('pick', $event)" @undo="emit('undo')" />
    <div class="row-text">
      <span class="row-name" :class="{ 'row-name--done': done }">{{ chore.name }}</span>
      <span class="row-meta">{{ metaLine(chore, couple) }}</span>
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
}

.row-name--done {
  color: var(--text-meta);
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

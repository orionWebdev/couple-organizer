<script setup lang="ts">
import { computed } from 'vue'
import type { Chore, ChoreAssignee, Couple } from '@/types'
import TaskAbhakControl from './TaskAbhakControl.vue'
import { isDoneToday, metaLine, recurLabel } from '@/utils/chores'
import { pointsForChore } from '@/utils/points'

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
const points = computed(() => pointsForChore(props.chore))
</script>

<template>
  <div class="row list-row">
    <div class="row-top">
      <div class="row-text">
        <div class="row-title-line">
          <span class="row-name" :class="{ 'row-name--done': struck }">{{ chore.name }}</span>
          <span class="points-badge">{{ points }} P</span>
        </div>
        <span class="row-meta">{{ metaLine(chore, couple, todayCount) }}</span>
      </div>
      <span class="row-recur">{{ recurLabel(chore) }}</span>
    </div>
    <div class="row-actions">
      <TaskAbhakControl :chore="chore" :couple="couple" :todayCount="todayCount" @pick="emit('pick', $event)" @undo="emit('undo')" />
    </div>
  </div>
</template>

<style scoped>
/* Nido: weiße Karte — Text/Zuweisung oben, Erledigt-Buttons als zweite Zeile */
.row {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px 13px;
  background: var(--surface);
  border: 1px solid var(--border-softer);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-card);
}

.row-top {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.row-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.row-title-line {
  display: flex;
  align-items: center;
  gap: 7px;
  flex-wrap: wrap;
}

.row-name {
  font-size: 14px;
  font-weight: 700;
  color: var(--text);
  transition: color var(--dur-base) var(--ease-standard);
}

.row-name--done {
  color: var(--text-faint);
  text-decoration: line-through;
}

.points-badge {
  font-family: var(--font-headline);
  font-size: 11px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--accent) 14%, transparent);
  color: var(--accent);
  flex-shrink: 0;
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

.row-actions {
  display: flex;
}
</style>

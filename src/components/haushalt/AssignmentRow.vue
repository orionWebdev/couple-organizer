<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Chore, ChoreAssignee, ChoreHistoryEntry, Couple } from '@/types'
import TaskAbhakControl from './TaskAbhakControl.vue'
import { assigneeAvatarVisual, personName, recurLabel, relativeCompletionLabel } from '@/utils/chores'

const props = withDefaults(defineProps<{
  chore: Chore
  lastEntry: ChoreHistoryEntry | null
  couple: Couple | null
  todayCount?: number
}>(), { todayCount: 0 })

const emit = defineEmits<{
  pick: [assignee: ChoreAssignee]
  undo: []
}>()

const expanded = ref(false)

function toggle() {
  expanded.value = !expanded.value
}

function handlePick(assignee: ChoreAssignee) {
  emit('pick', assignee)
  expanded.value = false
}

const avatar = computed(() => assigneeAvatarVisual(props.chore.assignee, props.couple))
const metaLabel = computed(() => `${recurLabel(props.chore)} · ${personName(props.chore.assignee, props.couple)}`)
const lastLabel = computed(() => relativeCompletionLabel(props.lastEntry?.completedAt ?? null))

// "Vertretung": jemand anderes als die zugewiesene Person hat zuletzt erledigt.
const isSubstitution = computed(() => {
  const assignee = props.chore.assignee
  const completedBy = props.lastEntry?.completedBy
  if (!props.lastEntry || !assignee || assignee === 'both' || !completedBy || completedBy === 'both') return false
  return completedBy !== assignee
})

const whoLabel = computed(() => {
  if (!props.lastEntry) return null
  const who = personName(props.lastEntry.completedBy, props.couple)
  return isSubstitution.value ? `von ${who} · Vertretung` : `von ${who}`
})
</script>

<template>
  <div class="row-wrap" :class="{ 'row-wrap--expanded': expanded }">
    <div class="row" @click="toggle">
      <span class="row-avatar" :class="{ 'row-avatar--icon': avatar.icon }" :style="{ background: avatar.bg, border: avatar.border, color: avatar.color }">{{ avatar.icon ?? avatar.init }}</span>
      <div class="row-text">
        <span class="row-name">{{ chore.name }}</span>
        <span class="row-meta">{{ metaLabel }}</span>
      </div>
      <div class="row-last">
        <span class="row-last-when">{{ lastLabel }}</span>
        <span v-if="whoLabel" class="row-last-who" :class="{ 'row-last-who--sub': isSubstitution }">{{ whoLabel }}</span>
      </div>
    </div>

    <div class="expand-track">
      <div class="expand-inner">
        <TaskAbhakControl
          :chore="chore"
          :couple="couple"
          :todayCount="todayCount"
          @pick="handlePick"
          @undo="emit('undo')"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.row-wrap {
  background: var(--surface);
  border: 1px solid var(--border-softer);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-card);
  transition: box-shadow 0.2s var(--ease-standard), border-color 0.2s var(--ease-standard);
}

.row-wrap--expanded {
  border-color: var(--accent);
  box-shadow: var(--shadow-float);
}

.row {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 11px 13px;
  cursor: pointer;
}

.row-wrap--expanded .row {
  padding-bottom: 8px;
}

.row-avatar {
  flex-shrink: 0;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  font-size: 12px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 6px rgba(60, 45, 30, 0.12);
}

.row-avatar--icon {
  font-size: 16px;
}

.row-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.row-name {
  font-size: 14px;
  font-weight: 700;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.row-meta {
  font-size: 11.5px;
  color: var(--text-meta);
}

.row-last {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
  text-align: right;
}

.row-last-when {
  font-size: 12.5px;
  font-weight: 700;
  color: var(--text);
  white-space: nowrap;
}

.row-last-who {
  font-size: 10.5px;
  color: var(--text-faint);
  white-space: nowrap;
}

.row-last-who--sub {
  color: var(--danger);
  font-weight: 600;
}

/* Höhen-Animation ohne feste Höhe: Grid-Trick statt max-height-Hack. */
.expand-track {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 0.32s var(--ease-standard);
}

.row-wrap--expanded .expand-track {
  grid-template-rows: 1fr;
}

.expand-inner {
  overflow: hidden;
  min-height: 0;
}

.row-wrap--expanded .expand-inner {
  padding: 2px 13px 13px;
}
</style>

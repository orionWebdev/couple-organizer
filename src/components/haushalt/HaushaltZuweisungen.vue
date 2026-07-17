<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Chore, ChoreAssignee, ChoreHistoryEntry, Couple } from '@/types'
import AssignmentRow from './AssignmentRow.vue'
import { personVisual } from '@/utils/chores'

const props = defineProps<{
  chores: readonly Chore[]
  history: readonly ChoreHistoryEntry[]
  couple: Couple | null
  currentUserId: string
  todayCounts: ReadonlyMap<string, number>
}>()

const emit = defineEmits<{
  pick: [chore: Chore, assignee: ChoreAssignee]
  undo: [chore: Chore]
}>()

// Standardmäßig auf die eigene Person gefiltert, damit man beim Öffnen sofort
// sieht, was zu tun ist. Erneuter Klick auf die eigene Karte hebt den Filter
// wieder auf.
const filterUid = ref<string | null>(props.currentUserId || null)

function toggleFilter(uid: string) {
  filterUid.value = filterUid.value === uid ? null : uid
}

// Aktive Aufgaben mit fester Zuweisung — offene (unassigned) Aufgaben gehören
// in den Pool-Filter „Offen" auf dem Alle-Tab, nicht in diese Übersicht.
const allAssignedChores = computed(() =>
  props.chores.filter((c) => !(c.type === 'once' && c.done) && c.assignee !== null)
)

const assignedChores = computed(() => {
  if (!filterUid.value) return allAssignedChores.value
  return allAssignedChores.value.filter((c) => c.assignee === filterUid.value || c.assignee === 'both')
})

function countFor(uid: string | null) {
  if (!uid) return 0
  return allAssignedChores.value.filter((c) => c.assignee === uid || c.assignee === 'both').length
}

const summary = computed(() => {
  const ids = props.couple?.memberIds ?? []
  return ids.map((uid) => {
    const visual = personVisual(uid, props.couple)
    return {
      uid,
      name: props.couple?.memberNames[uid] ?? 'Partner',
      init: visual.init,
      color: visual.color,
      tint: visual.tint,
      icon: visual.icon,
      count: countFor(uid),
    }
  })
})

const emptyMessage = computed(() => {
  if (allAssignedChores.value.length === 0) return 'Noch keine Aufgaben zugewiesen.'
  const name = summary.value.find((p) => p.uid === filterUid.value)?.name
  return name ? `Keine Aufgaben für ${name}.` : 'Noch keine Aufgaben zugewiesen.'
})

function lastEntryFor(choreId: string): ChoreHistoryEntry | null {
  return props.history.find((h) => h.choreId === choreId) ?? null
}
</script>

<template>
  <div class="zuweisungen">
    <div class="summary-row">
      <button
        v-for="person in summary"
        :key="person.uid"
        type="button"
        class="summary-card"
        :class="{ 'summary-card--active': filterUid === person.uid }"
        :style="{ background: filterUid === person.uid ? person.color : person.tint }"
        @click="toggleFilter(person.uid)"
      >
        <span
          class="summary-avatar"
          :class="{ 'summary-avatar--icon': person.icon }"
          :style="{ background: person.icon ? 'var(--surface-deep)' : person.color }"
        >{{ person.icon ?? person.init }}</span>
        <div class="summary-text">
          <span class="summary-name">{{ person.name }}</span>
          <span class="summary-count">{{ person.count }} Aufgabe{{ person.count === 1 ? '' : 'n' }}</span>
        </div>
      </button>
    </div>

    <div v-if="assignedChores.length > 0" class="table-head">
      <span>Aufgabe</span>
      <span>Zuletzt</span>
    </div>

    <div v-if="assignedChores.length === 0" class="empty">
      {{ emptyMessage }}
    </div>
    <div v-else class="list">
      <AssignmentRow
        v-for="c in assignedChores"
        :key="c.id"
        :chore="c"
        :lastEntry="lastEntryFor(c.id)"
        :couple="couple"
        :todayCount="todayCounts.get(c.id) ?? 0"
        @pick="emit('pick', c, $event)"
        @undo="emit('undo', c)"
      />
    </div>
  </div>
</template>

<style scoped>
.zuweisungen {
  padding: 0 var(--screen-pad);
}

.summary-row {
  display: flex;
  gap: 10px;
  margin-bottom: 18px;
}

.summary-card {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border-radius: var(--radius-card);
  min-width: 0;
  border: none;
  cursor: pointer;
  text-align: left;
  font-family: var(--font-body);
  transition: background 0.18s ease, transform 0.12s ease;
}

.summary-card:active {
  transform: scale(0.98);
}

.summary-avatar {
  flex-shrink: 0;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid var(--surface);
  box-shadow: 0 2px 6px rgba(60, 45, 30, 0.12);
  flex-shrink: 0;
}

.summary-avatar--icon {
  font-size: 19px;
}

.summary-text {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.summary-name {
  font-size: 13.5px;
  font-weight: 700;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: color 0.18s ease;
}

.summary-count {
  font-size: 11px;
  color: var(--text-secondary);
  transition: color 0.18s ease;
}

.summary-card--active .summary-name {
  color: #fff;
}

.summary-card--active .summary-count {
  color: rgba(255, 255, 255, 0.85);
}

.table-head {
  display: flex;
  justify-content: space-between;
  padding: 0 13px 8px;
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.6px;
  text-transform: uppercase;
  color: var(--text-meta);
}

.list {
  display: flex;
  flex-direction: column;
  gap: 9px;
}

.empty {
  text-align: center;
  padding: 40px 20px;
  color: var(--text-faint);
  font-size: 13.5px;
  line-height: 1.5;
}
</style>

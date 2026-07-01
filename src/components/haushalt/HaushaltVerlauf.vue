<script setup lang="ts">
import { computed, ref } from 'vue'
import type { ChoreAssignee, ChoreHistoryEntry, Couple } from '@/types'
import TimelineEntry from './TimelineEntry.vue'

const props = defineProps<{
  history: readonly ChoreHistoryEntry[]
  couple: Couple | null
}>()

const emit = defineEmits<{
  assign: [entry: ChoreHistoryEntry, assignee: ChoreAssignee]
  delete: [entry: ChoreHistoryEntry]
}>()

const selectedMonth = ref(new Date().getMonth())
const selectedYear = ref(new Date().getFullYear())
const menuOpenId = ref<string | null>(null)

const months = computed(() => {
  const result: Array<{ label: string; month: number; year: number }> = []
  const now = new Date()
  for (let i = 0; i < 4; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    result.push({
      label: new Intl.DateTimeFormat('de-DE', { month: 'long', year: 'numeric' }).format(d),
      month: d.getMonth(),
      year: d.getFullYear()
    })
  }
  return result
})

const filteredByMonth = computed(() =>
  props.history.filter((h) => {
    const date = (h.completedAt as any)?.toDate?.() ?? null
    if (!date) return false
    return date.getMonth() === selectedMonth.value && date.getFullYear() === selectedYear.value
  })
)

interface DayGroup { label: string; items: ChoreHistoryEntry[] }

const grouped = computed<DayGroup[]>(() => {
  const map = new Map<string, ChoreHistoryEntry[]>()
  for (const h of filteredByMonth.value) {
    const date = (h.completedAt as any)?.toDate?.() ?? new Date()
    const key = new Intl.DateTimeFormat('de-DE', { weekday: 'long', day: 'numeric', month: 'long' }).format(date)
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(h)
  }
  return [...map.entries()].map(([label, items]) => ({ label, items }))
})

function dotColor(entry: ChoreHistoryEntry): string {
  if (entry.completedBy === 'both') return 'var(--accent)'
  if (!entry.completedBy) return 'var(--text-faint)'
  const idx = props.couple?.memberIds.indexOf(entry.completedBy) ?? -1
  return idx === 0 ? 'var(--chris)' : 'var(--sarah)'
}

function toggleMenu(id: string) {
  menuOpenId.value = menuOpenId.value === id ? null : id
}
</script>

<template>
  <div class="verlauf">
    <div class="month-row">
      <button
        v-for="m in months"
        :key="`${m.year}-${m.month}`"
        class="month-chip"
        :class="{ 'month-chip--active': m.month === selectedMonth && m.year === selectedYear }"
        @click="selectedMonth = m.month; selectedYear = m.year"
      >
        {{ m.label }}
      </button>
    </div>

    <div v-if="grouped.length === 0" class="empty">
      Keine Einträge in diesem Monat.
    </div>

    <div v-else class="timeline">
      <div v-for="group in grouped" :key="group.label" class="day-group">
        <div class="day-label">{{ group.label }}</div>
        <div class="day-entries">
          <div v-for="h in group.items" :key="h.id" class="entry-wrap">
            <span class="entry-dot" :style="{ background: dotColor(h) }" />
            <TimelineEntry
              :entry="h"
              :couple="couple"
              :menuOpen="menuOpenId === h.id"
              @toggleMenu="toggleMenu(h.id)"
              @assign="emit('assign', h, $event)"
              @delete="emit('delete', h)"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.verlauf {
  padding: 0 var(--screen-pad);
}

.month-row {
  display: flex;
  gap: 7px;
  margin-bottom: 18px;
  overflow-x: auto;
}

.month-chip {
  padding: 7px 13px;
  background: transparent;
  border: 1px solid var(--border-softer);
  border-radius: 9px;
  color: var(--text-meta);
  font-family: 'Hanken Grotesk', system-ui, sans-serif;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  transition: all 0.15s ease;
}

.month-chip--active {
  background: var(--accent-tint);
  border-color: var(--accent);
  color: var(--text);
}

.empty {
  font-size: 13.5px;
  color: var(--text-faint);
  text-align: center;
  padding: 40px 0;
  line-height: 1.5;
}

.timeline {
  display: flex;
  flex-direction: column;
  gap: 14px 0;
}

.day-group {
  margin-bottom: 8px;
}

.day-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-meta);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  margin: 14px 0 8px;
  padding-left: 24px;
}

.day-entries {
  position: relative;
}

.entry-wrap {
  position: relative;
  padding-left: 24px;
}

.entry-wrap::before {
  content: '';
  position: absolute;
  left: 5px;
  top: 0;
  bottom: 0;
  width: 1.5px;
  background: var(--border-softer);
}

.entry-dot {
  position: absolute;
  left: 0;
  top: 16px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 2px solid var(--surface-deep);
  z-index: 1;
}
</style>

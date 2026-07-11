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

const menuOpenId = ref<string | null>(null)

function completedDate(entry: ChoreHistoryEntry): Date | null {
  return (entry.completedAt as any)?.toDate?.() ?? null
}

// Nur Monate anbieten, in denen wirklich etwas getrackt wurde — keine leeren
// Monate „auf Vorrat" wie beim früheren „letzte 4 Monate"-Fenster.
const months = computed(() => {
  const map = new Map<string, { key: string; label: string; month: number; year: number }>()
  for (const h of props.history) {
    const date = completedDate(h)
    if (!date) continue
    const month = date.getMonth()
    const year = date.getFullYear()
    const key = `${year}-${month}`
    if (map.has(key)) continue
    map.set(key, {
      key,
      label: new Intl.DateTimeFormat('de-DE', { month: 'long', year: 'numeric' }).format(date),
      month,
      year,
    })
  }
  // Neuester Monat zuerst.
  return [...map.values()].sort((a, b) => b.year - a.year || b.month - a.month)
})

// Bewusst nur die Auswahl merken, nicht den Monat selbst: Läuft der gewählte
// Monat leer (letzter Eintrag gelöscht), fällt die Ansicht auf den neuesten
// Monat mit Einträgen zurück, statt auf einem toten Chip stehen zu bleiben.
const selectedKey = ref<string | null>(null)

const activeMonth = computed(
  () => months.value.find((m) => m.key === selectedKey.value) ?? months.value[0] ?? null
)

const filteredByMonth = computed(() => {
  const active = activeMonth.value
  if (!active) return []
  return props.history.filter((h) => {
    const date = completedDate(h)
    if (!date) return false
    return date.getMonth() === active.month && date.getFullYear() === active.year
  })
})

interface DayGroup { label: string; items: ChoreHistoryEntry[] }

const grouped = computed<DayGroup[]>(() => {
  const map = new Map<string, ChoreHistoryEntry[]>()
  for (const h of filteredByMonth.value) {
    const date = completedDate(h) ?? new Date()
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
    <div v-if="months.length > 0" class="month-row" data-hswipe-skip>
      <button
        v-for="m in months"
        :key="m.key"
        class="month-chip"
        :class="{ 'month-chip--active': m.key === activeMonth?.key }"
        @click="selectedKey = m.key"
      >
        {{ m.label }}
      </button>
    </div>

    <div v-if="months.length === 0" class="empty">
      Noch nichts getrackt. Sobald ihr Aufgaben abhakt, erscheinen sie hier.
    </div>
    <div v-else-if="grouped.length === 0" class="empty">
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
  background: var(--surface);
  border: 1px solid var(--border-softer);
  border-radius: 10px;
  color: var(--text-meta);
  font-family: var(--font-body);
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  box-shadow: var(--shadow-card);
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
  font-weight: 700;
  color: var(--text-meta);
  letter-spacing: 0.6px;
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
  border: 2px solid var(--bg);
  z-index: 1;
}
</style>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Todo, Couple } from '@/types'
import TimelineEntry from './TimelineEntry.vue'

const props = defineProps<{
  todos: readonly Todo[]
  couple: Couple | null
}>()

const emit = defineEmits<{ delete: [id: string] }>()

const selectedMonth = ref(new Date().getMonth())
const selectedYear = ref(new Date().getFullYear())

const months = computed(() => {
  const result: Array<{ label: string; month: number; year: number }> = []
  const now = new Date()
  for (let i = 0; i < 4; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    result.push({
      label: new Intl.DateTimeFormat('de-DE', { month: 'short', year: '2-digit' }).format(d),
      month: d.getMonth(),
      year: d.getFullYear()
    })
  }
  return result
})

const doneTodos = computed(() =>
  props.todos.filter(t => t.done)
)

const filteredByMonth = computed(() =>
  doneTodos.value.filter(t => {
    const date = (t.updatedAt as any)?.toDate?.() ?? null
    if (!date) return false
    return date.getMonth() === selectedMonth.value && date.getFullYear() === selectedYear.value
  })
)

interface DayGroup { label: string; items: Todo[] }

const grouped = computed<DayGroup[]>(() => {
  const map = new Map<string, Todo[]>()
  for (const t of filteredByMonth.value) {
    const date = (t.updatedAt as any)?.toDate?.() ?? new Date()
    const key = new Intl.DateTimeFormat('de-DE', { weekday: 'long', day: 'numeric', month: 'long' }).format(date)
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(t)
  }
  return [...map.entries()].map(([label, items]) => ({ label, items }))
})
</script>

<template>
  <div class="verlauf">
    <!-- Month filter -->
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

    <!-- Empty state -->
    <div v-if="grouped.length === 0" class="empty">
      Keine erledigten Aufgaben in diesem Monat.
    </div>

    <!-- Timeline groups -->
    <div v-else class="timeline">
      <div
        v-for="group in grouped"
        :key="group.label"
        class="day-group"
      >
        <div class="day-label">{{ group.label }}</div>
        <div class="day-entries">
          <TimelineEntry
            v-for="t in group.items"
            :key="t.id"
            :todo="t"
            :couple="couple"
            @delete="emit('delete', t.id)"
          />
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
  gap: 8px;
  margin-bottom: 20px;
  overflow-x: auto;
}

.month-chip {
  padding: 6px 14px;
  background: var(--surface-deep);
  border: 1px solid var(--border-soft);
  border-radius: 100px;
  color: var(--text-meta);
  font-family: 'Hanken Grotesk', system-ui, sans-serif;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  transition: all 0.15s ease;
}

.month-chip--active {
  background: var(--accent-tint);
  border-color: var(--accent);
  color: var(--accent);
}

.empty {
  font-size: 14px;
  color: var(--text-faint);
  text-align: center;
  padding: 40px 0;
}

.timeline {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.day-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-faint);
  letter-spacing: 0.07em;
  text-transform: uppercase;
  margin-bottom: 8px;
}

.day-entries {
  border-left: 1.5px solid var(--border);
  padding-left: 16px;
}
</style>

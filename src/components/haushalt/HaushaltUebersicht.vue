<script setup lang="ts">
import { computed } from 'vue'
import type { Chore, ChoreHistoryEntry, Couple } from '@/types'
import { dueBucket, isDoneToday, personVisual } from '@/utils/chores'

const props = defineProps<{
  chores: readonly Chore[]
  history: readonly ChoreHistoryEntry[]
  couple: Couple | null
}>()

function toMillis(timestamp: unknown): number {
  if (timestamp && typeof timestamp === 'object' && 'toMillis' in timestamp) {
    return (timestamp as { toMillis: () => number }).toMillis()
  }
  return 0
}

const people = computed(() => (props.couple?.memberIds ?? []).map((uid) => {
  const visual = personVisual(uid, props.couple)
  const relevant = props.chores.filter((c) => {
    if (!(c.assignee === uid || c.assignee === 'both')) return false
    if (c.type === 'once' && c.done) return false
    const bucket = dueBucket(c)
    return bucket === 'today' || bucket === 'none'
  })
  const done = relevant.filter(isDoneToday)
  const open = relevant.filter((c) => !isDoneToday(c))
  const total = relevant.length
  return {
    uid,
    name: props.couple?.memberNames[uid] ?? 'Partner',
    init: visual.init,
    color: visual.color,
    doneCount: done.length,
    totalCount: total,
    pct: total === 0 ? 0 : Math.round(done.length / total * 100),
    openPreview: open.slice(0, 3),
    moreCount: Math.max(0, open.length - 3),
    allDone: total > 0 && open.length === 0
  }
}))

const currentMonth = new Date().getMonth()
const currentYear = new Date().getFullYear()

const monthHistory = computed(() => props.history.filter((h) => {
  const date = (h.completedAt as any)?.toDate?.() ?? null
  return date && date.getMonth() === currentMonth && date.getFullYear() === currentYear
}))

const personA = computed(() => props.couple?.memberIds[0] ?? null)
const personB = computed(() => props.couple?.memberIds[1] ?? null)

function countFor(entries: readonly ChoreHistoryEntry[], uid: string | null) {
  if (!uid) return 0
  return entries.filter((h) => h.completedBy === uid || h.completedBy === 'both').length
}

const statsChrisTotal = computed(() => countFor(monthHistory.value, personA.value))
const statsSarahTotal = computed(() => countFor(monthHistory.value, personB.value))
const statsTotal = computed(() => monthHistory.value.length)
const statsChrisW = computed(() => {
  const sum = statsChrisTotal.value + statsSarahTotal.value
  return sum === 0 ? 50 : Math.round(statsChrisTotal.value / sum * 100)
})
const statsSarahW = computed(() => 100 - statsChrisW.value)

const statRows = computed(() => {
  const byName = new Map<string, ChoreHistoryEntry[]>()
  for (const h of monthHistory.value) {
    if (!byName.has(h.choreName)) byName.set(h.choreName, [])
    byName.get(h.choreName)!.push(h)
  }
  return [...byName.entries()]
    .map(([name, entries]) => {
      const chris = countFor(entries, personA.value)
      const sarah = countFor(entries, personB.value)
      const sum = chris + sarah
      return {
        name,
        total: entries.length,
        chrisW: sum === 0 ? 50 : Math.round(chris / sum * 100),
        sarahW: sum === 0 ? 50 : Math.round(sarah / sum * 100)
      }
    })
    .sort((a, b) => toMillis(byName.get(b.name)![0].completedAt) - toMillis(byName.get(a.name)![0].completedAt))
})
</script>

<template>
  <div class="uebersicht">
    <div v-for="p in people" :key="p.uid" class="person-card">
      <div class="person-head">
        <span class="person-avatar" :style="{ background: p.color }">{{ p.init }}</span>
        <div class="person-info">
          <div class="person-name">{{ p.name }}</div>
          <div class="person-sub">{{ p.doneCount }} von {{ p.totalCount }} heute erledigt</div>
        </div>
      </div>
      <div class="person-bar">
        <div class="person-bar-fill" :style="{ background: p.color, width: p.pct + '%' }" />
      </div>
      <div v-if="p.openPreview.length > 0">
        <div v-for="o in p.openPreview" :key="o.id" class="preview-row">
          <span class="preview-dot" />
          {{ o.name }}
        </div>
        <div v-if="p.moreCount > 0" class="preview-more">+{{ p.moreCount }} weitere</div>
      </div>
      <div v-else-if="p.allDone" class="all-done">Alles für heute erledigt ✓</div>
    </div>

    <div class="stats-card">
      <div class="section-label">Diesen Monat gemeinsam</div>
      <div class="stats-total-row">
        <span class="stats-total mono">{{ statsTotal }}</span>
        <span class="stats-total-label">Aufgaben erledigt</span>
      </div>
      <div class="stats-bar">
        <div class="stats-bar-chris" :style="{ width: statsChrisW + '%' }" />
        <div class="stats-bar-sarah" :style="{ width: statsSarahW + '%' }" />
      </div>
      <div class="stats-legend">
        <span class="legend-item"><i class="legend-dot legend-dot--chris" />{{ couple?.memberNames[personA ?? ''] ?? 'Person A' }} · {{ statsChrisTotal }}</span>
        <span class="legend-item">{{ couple?.memberNames[personB ?? ''] ?? 'Person B' }} · {{ statsSarahTotal }}<i class="legend-dot legend-dot--sarah" /></span>
      </div>
    </div>

    <template v-if="statRows.length > 0">
      <div class="section-label rows-label">Nach Aufgabe</div>
      <div class="stat-rows">
        <div v-for="row in statRows" :key="row.name" class="stat-row">
          <div class="stat-row-head">
            <span class="stat-row-name">{{ row.name }}</span>
            <span class="stat-row-total">{{ row.total }}×</span>
          </div>
          <div class="stat-row-bar">
            <div class="stat-row-chris" :style="{ width: row.chrisW + '%' }" />
            <div class="stat-row-sarah" :style="{ width: row.sarahW + '%' }" />
          </div>
        </div>
      </div>
    </template>
    <div v-else class="empty">Noch keine erledigten Aufgaben diesen Monat.</div>
  </div>
</template>

<style scoped>
.uebersicht {
  padding: 0 var(--screen-pad);
}

.person-card {
  border: 1px solid var(--border);
  border-radius: 18px;
  padding: 16px;
  background: var(--surface);
  margin-bottom: 14px;
}

.person-head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.person-avatar {
  width: 32px;
  height: 32px;
  border-radius: 9px;
  color: #15110d;
  font-size: 13px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.person-info {
  flex: 1;
  min-width: 0;
}

.person-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
}

.person-sub {
  font-size: 11.5px;
  color: var(--text-meta);
  margin-top: 1px;
}

.person-bar {
  height: 6px;
  border-radius: 4px;
  background: var(--border-soft);
  overflow: hidden;
  margin-bottom: 12px;
}

.person-bar-fill {
  height: 100%;
  transition: width 0.3s ease;
}

.preview-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 0;
  font-size: 13px;
  color: #c9c1b7;
}

.preview-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--text-faint);
  flex-shrink: 0;
}

.preview-more {
  font-size: 11.5px;
  color: var(--text-faint);
  margin-top: 2px;
}

.all-done {
  font-size: 12.5px;
  color: var(--accent);
  padding: 4px 0;
}

.stats-card {
  border: 1px solid var(--border);
  border-radius: 18px;
  padding: 18px;
  background: var(--surface);
  margin-bottom: 20px;
}

.stats-total-row {
  margin-top: 8px;
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.stats-total {
  font-size: 34px;
  font-weight: 500;
  color: var(--text);
}

.stats-total-label {
  font-size: 13px;
  color: var(--text-meta);
}

.stats-bar {
  margin-top: 18px;
  height: 12px;
  border-radius: 7px;
  overflow: hidden;
  display: flex;
}

.stats-bar-chris {
  background: var(--chris);
}

.stats-bar-sarah {
  background: var(--sarah);
}

.stats-legend {
  margin-top: 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  color: var(--text-meta);
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 2px;
  display: block;
}

.legend-dot--chris { background: var(--chris); }
.legend-dot--sarah { background: var(--sarah); }

.rows-label {
  margin-bottom: 8px;
}

.stat-rows {
  display: flex;
  flex-direction: column;
}

.stat-row {
  padding: 11px 0;
  border-bottom: 1px solid var(--border-softer);
}

.stat-row-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.stat-row-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--text);
}

.stat-row-total {
  font-size: 11.5px;
  color: var(--text-meta);
}

.stat-row-bar {
  height: 7px;
  border-radius: 4px;
  overflow: hidden;
  display: flex;
  background: var(--border-soft);
}

.stat-row-chris { background: var(--chris); }
.stat-row-sarah { background: var(--sarah); }

.empty {
  text-align: center;
  padding: 40px 0;
  color: var(--text-faint);
  font-size: 13.5px;
}
</style>

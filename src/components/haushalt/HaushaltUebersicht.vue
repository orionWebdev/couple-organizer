<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref } from 'vue'
import type { Chore, ChoreAssignee, ChoreHistoryEntry, Couple } from '@/types'
import { personVisual } from '@/utils/chores'
import { pointsForHistory } from '@/utils/points'
import HaushaltVerlauf from './HaushaltVerlauf.vue'

const props = defineProps<{
  chores: readonly Chore[]
  history: readonly ChoreHistoryEntry[]
  couple: Couple | null
}>()

const emit = defineEmits<{
  assign: [entry: ChoreHistoryEntry, assignee: ChoreAssignee]
  delete: [entry: ChoreHistoryEntry]
}>()

function toMillis(timestamp: unknown): number {
  if (timestamp && typeof timestamp === 'object' && 'toMillis' in timestamp) {
    return (timestamp as { toMillis: () => number }).toMillis()
  }
  return 0
}

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

function pointsFor(entries: readonly ChoreHistoryEntry[], uid: string | null) {
  if (!uid) return 0
  return entries
    .filter((h) => h.completedBy === uid || h.completedBy === 'both')
    .reduce((sum, h) => sum + pointsForHistory(h), 0)
}

// ── Punkte-Leaderboard (gesamter Verlauf) ────────────────────
const leaderboard = computed(() => {
  const ids = props.couple?.memberIds ?? []
  const rows = ids.map((uid) => {
    const visual = personVisual(uid, props.couple)
    return {
      uid,
      name: props.couple?.memberNames[uid] ?? 'Partner',
      init: visual.init,
      color: visual.color,
      icon: visual.icon,
      points: pointsFor(props.history, uid),
      tasks: countFor(props.history, uid),
    }
  })
  const max = Math.max(1, ...rows.map((r) => r.points))
  const leaderPoints = Math.max(...rows.map((r) => r.points), 0)
  return rows
    .map((r) => ({
      ...r,
      pct: Math.round((r.points / max) * 100),
      isLeader: leaderPoints > 0 && r.points === leaderPoints,
    }))
    .sort((a, b) => b.points - a.points)
})

// Bei Gleichstand keinen alleinigen Anführer glühen lassen.
const hasSoleLeader = computed(() =>
  leaderboard.value.filter((r) => r.isLeader).length === 1
)

// ── Lade-Animation: Balken wachsen + Punkte zählen hoch ───────
const anim = ref(0)
let raf = 0

function runAnim() {
  const start = performance.now()
  const duration = 900
  const tick = (now: number) => {
    const t = Math.min(1, (now - start) / duration)
    // easeOutCubic
    anim.value = 1 - Math.pow(1 - t, 3)
    if (t < 1) raf = requestAnimationFrame(tick)
  }
  raf = requestAnimationFrame(tick)
}

onMounted(() => {
  requestAnimationFrame(runAnim)
})

onBeforeUnmount(() => {
  if (raf) cancelAnimationFrame(raf)
})

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
    <!-- Punktestand-Leaderboard -->
    <div class="leaderboard-card">
      <div class="lead-head">
        <span class="section-label">Punktestand</span>
        <span class="lead-total mono">{{ statsTotal }} Aufgaben diesen Monat</span>
      </div>

      <div class="lead-rows">
        <div
          v-for="(row, i) in leaderboard"
          :key="row.uid"
          class="lead-row"
        >
          <span
            class="lead-avatar"
            :class="{ 'lead-avatar--icon': row.icon }"
            :style="{ background: row.icon ? 'var(--surface-deep)' : row.color }"
          >{{ row.icon ?? row.init }}</span>
          <div class="lead-body">
            <div class="lead-name-line">
              <span class="lead-name">
                {{ row.name }}
                <span v-if="i === 0 && row.isLeader && hasSoleLeader" class="lead-crown" aria-label="Führung">👑</span>
              </span>
              <span class="lead-points mono">{{ Math.round(row.points * anim) }} P</span>
            </div>
            <div class="lead-bar">
              <div
                class="lead-bar-fill"
                :class="{ 'lead-bar-fill--leader': row.isLeader && hasSoleLeader }"
                :style="{ width: (row.pct * anim) + '%', background: row.color }"
              />
            </div>
            <div class="lead-sub">{{ row.tasks }} erledigt</div>
          </div>
        </div>
      </div>

      <div v-if="leaderboard.every((r) => r.points === 0)" class="lead-empty">
        Noch keine Punkte gesammelt — erledigt die erste Aufgabe! ✨
      </div>
    </div>

    <div v-if="statRows.length > 0" class="stats-card">
      <div class="section-label">Diesen Monat gemeinsam</div>
      <div class="stats-bar">
        <div class="stats-bar-chris" :style="{ width: statsChrisW + '%' }" />
        <div class="stats-bar-sarah" :style="{ width: statsSarahW + '%' }" />
      </div>
      <div class="stats-legend">
        <span class="legend-item"><i class="legend-dot legend-dot--chris" />{{ couple?.memberNames[personA ?? ''] ?? 'Person A' }} · {{ statsChrisTotal }}</span>
        <span class="legend-item">{{ couple?.memberNames[personB ?? ''] ?? 'Person B' }} · {{ statsSarahTotal }}<i class="legend-dot legend-dot--sarah" /></span>
      </div>
    </div>

    <div class="section-label rows-label">Verlauf</div>
    <HaushaltVerlauf
      class="verlauf-embed"
      :history="history"
      :couple="couple"
      @assign="(entry, assignee) => emit('assign', entry, assignee)"
      @delete="(entry) => emit('delete', entry)"
    />
  </div>
</template>

<style scoped>
.uebersicht {
  padding: 0 var(--screen-pad);
}

/* ── Leaderboard ─────────────────────────────────────────── */
.leaderboard-card {
  border: 1px solid var(--border-softer);
  border-radius: var(--radius-card-lg);
  padding: 18px 16px;
  background: var(--surface);
  box-shadow: var(--shadow-card);
  margin-bottom: 16px;
}

.lead-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 16px;
}

.lead-total {
  font-size: 12px;
  color: var(--text-meta);
}

.lead-rows {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.lead-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.lead-avatar {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  color: #fff;
  font-size: 14px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border: 2px solid var(--surface);
  box-shadow: 0 2px 6px rgba(60, 45, 30, 0.12);
}

.lead-avatar--icon {
  font-size: 21px;
}

.lead-body {
  flex: 1;
  min-width: 0;
}

.lead-name-line {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 6px;
}

.lead-name {
  font-size: 14px;
  font-weight: 700;
  color: var(--text);
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.lead-crown {
  font-size: 13px;
}

.lead-points {
  font-size: 15px;
  color: var(--text);
  flex-shrink: 0;
}

.lead-bar {
  height: 12px;
  border-radius: 7px;
  background: var(--surface-deep);
  overflow: hidden;
}

.lead-bar-fill {
  height: 100%;
  border-radius: 7px;
  /* Balkenbreite wird per JS animiert; leichte CSS-Transition für Datenupdates */
  transition: width 0.35s var(--ease-standard);
}

/* Sanftes Glühen für die aktuelle Führung */
.lead-bar-fill--leader {
  animation: leader-glow 2s ease-in-out infinite;
}

@keyframes leader-glow {
  0%, 100% {
    box-shadow: 0 0 0 0 color-mix(in srgb, var(--accent) 0%, transparent);
    filter: saturate(1);
  }
  50% {
    box-shadow: 0 0 10px 2px color-mix(in srgb, var(--accent) 55%, transparent);
    filter: saturate(1.15);
  }
}

@media (prefers-reduced-motion: reduce) {
  .lead-bar-fill--leader {
    animation: none;
    box-shadow: 0 0 8px 1px color-mix(in srgb, var(--accent) 40%, transparent);
  }
}

.lead-sub {
  font-size: 11px;
  color: var(--text-meta);
  margin-top: 4px;
}

.lead-empty {
  margin-top: 14px;
  font-size: 12.5px;
  color: var(--text-meta);
  text-align: center;
  line-height: 1.5;
}

/* ── Monatsverteilung ────────────────────────────────────── */
.stats-card {
  border: 1px solid rgba(255, 255, 255, 0.55);
  border-radius: var(--radius-card-lg);
  padding: 18px;
  background: var(--accent-tint);
  margin-bottom: 20px;
}

.stats-bar {
  margin-top: 14px;
  height: 12px;
  border-radius: 7px;
  overflow: hidden;
  display: flex;
  background: var(--surface);
}

.stats-bar-chris {
  background: var(--chris);
  transition: width 0.4s var(--ease-standard);
}

.stats-bar-sarah {
  background: var(--sarah);
  transition: width 0.4s var(--ease-standard);
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
  border-radius: 50%;
  display: block;
}

.legend-dot--chris { background: var(--chris); }
.legend-dot--sarah { background: var(--sarah); }

.rows-label {
  margin-bottom: 8px;
}

/* Der Verlauf bringt sein eigenes seitliches Padding mit (.verlauf-embed landet
   auf dessen Wurzel) — hier neutralisieren, damit die Timeline bündig zu den
   Karten darüber sitzt. */
.verlauf-embed {
  padding: 0;
}
</style>

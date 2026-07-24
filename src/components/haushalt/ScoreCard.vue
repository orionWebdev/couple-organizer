<script setup lang="ts">
// Punktestand-Widget in Alltag › Aufgaben. Zeigt den Stand je Person (auf der
// VOLLEN Historie gerechnet — nie gefenstert, das wäre der Score-Bug aus
// CLAUDE.md), verlinkt die wertende Einordnung nach Wir („Balance in Wir ›")
// und öffnet den Verlauf als eigene gestapelte Seite.
//
// Die Zahlen sind gratis gerechnet; die KI-Formulierung dazu lebt allein im
// Coach im Wir-Tab. Ton: der Punktestand zählt, er wertet nicht.
import { computed } from 'vue'
import type { ChoreHistoryEntry, Couple } from '@/types'
import { personVisual } from '@/utils/chores'
import { pointsForHistory } from '@/utils/points'

const props = defineProps<{
  history: readonly ChoreHistoryEntry[]
  couple: Couple | null
}>()

defineEmits<{
  balance: []
  verlauf: []
}>()

function pointsFor(uid: string) {
  return props.history
    .filter((h) => h.completedBy === uid || h.completedBy === 'both')
    .reduce((sum, h) => sum + pointsForHistory(h), 0)
}

const rows = computed(() => {
  const ids = props.couple?.memberIds ?? []
  const raw = ids.map((uid) => {
    const visual = personVisual(uid, props.couple)
    return {
      uid,
      name: props.couple?.memberNames[uid] ?? 'Partner',
      color: visual.color,
      points: pointsFor(uid),
    }
  })
  const max = Math.max(1, ...raw.map((r) => r.points))
  return raw
    .map((r) => ({ ...r, pct: Math.round((r.points / max) * 100) }))
    .sort((a, b) => b.points - a.points)
})
</script>

<template>
  <div class="score">
    <div class="score__top">
      <span class="section-label">Punktestand</span>
      <button type="button" class="score__link" @click="$emit('balance')">Balance in Wir ›</button>
    </div>

    <div v-for="row in rows" :key="row.uid" class="lead-row">
      <span class="who">{{ row.name }}</span>
      <span class="bar"><i :style="{ width: `${row.pct}%`, background: row.color }" /></span>
      <span class="pts mono">{{ row.points }} P</span>
    </div>

    <button type="button" class="score__hist" @click="$emit('verlauf')">
      <span class="hist-ico" aria-hidden="true">🕘</span>
      <span class="hist-text">Verlauf<span>Wer hat wann was erledigt</span></span>
      <span class="hist-go" aria-hidden="true">›</span>
    </button>
  </div>
</template>

<style scoped>
.score {
  background: var(--surface);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-card);
  padding: 14px 15px;
  margin: 0 var(--screen-pad) 12px;
}

.score__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 13px;
}

.score__link {
  border: none;
  background: none;
  padding: 2px 4px;
  font-family: var(--font-body);
  font-size: 12px;
  font-weight: 800;
  color: var(--accent);
  cursor: pointer;
}

.lead-row {
  display: flex;
  align-items: center;
  gap: 10px;
}
.lead-row + .lead-row {
  margin-top: 9px;
}

.who {
  width: 54px;
  font-size: 12.5px;
  font-weight: 800;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.bar {
  flex: 1;
  height: 8px;
  border-radius: 99px;
  background: var(--surface-deep);
  overflow: hidden;
}
.bar i {
  display: block;
  height: 100%;
  border-radius: 99px;
  transition: width 0.6s var(--ease-standard);
}

.pts {
  width: 44px;
  text-align: right;
  font-size: 13px;
  color: var(--text-secondary);
}

.score__hist {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  margin-top: 13px;
  padding-top: 12px;
  border: none;
  border-top: 1px solid var(--border-softer);
  background: none;
  cursor: pointer;
  text-align: left;
}

.hist-ico {
  flex: none;
  width: 30px;
  height: 30px;
  border-radius: var(--radius-tile);
  display: grid;
  place-items: center;
  font-size: 15px;
  background: var(--surface-deep);
}

.hist-text {
  flex: 1;
  font-size: 13px;
  font-weight: 700;
  color: var(--text);
}
.hist-text span {
  display: block;
  font-size: 11px;
  font-weight: 700;
  color: var(--text-meta);
  margin-top: 2px;
}

.hist-go {
  font-size: 19px;
  color: var(--text-faint);
}
</style>

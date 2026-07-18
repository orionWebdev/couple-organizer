<script setup lang="ts">
import { computed, reactive } from 'vue'
import type { Chore, ChoreHistoryEntry } from '@/types'
import { roomDef, roomOf } from '@/utils/rooms'

const props = defineProps<{
  chores: readonly Chore[] // meine favorisierten Chores (bereits gefiltert)
  history: readonly ChoreHistoryEntry[]
  currentUserId: string
}>()

const emit = defineEmits<{
  (e: 'tap', chore: Chore): void
  (e: 'add'): void
}>()

// SVG-Ring-Geometrie (viewBox 0 0 58 58, r=26) → Umfang ≈ 163.
const RING_LEN = 163

// Lokaler YYYY-MM-DD-Schlüssel (History-Timestamps sind UTC-Instant).
function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function toDate(ts: unknown): Date | null {
  if (ts && typeof ts === 'object' && 'toDate' in ts) return (ts as { toDate: () => Date }).toDate()
  return null
}

const todayKey = dayKey(new Date())

// choreId → wie oft ich diese Aufgabe heute erledigt habe (= Verlaufseinträge).
const todayCounts = computed(() => {
  const counts: Record<string, number> = {}
  for (const h of props.history) {
    if (h.completedBy !== props.currentUserId) continue
    const d = toDate(h.completedAt)
    if (!d || dayKey(d) !== todayKey) continue
    counts[h.choreId] = (counts[h.choreId] ?? 0) + 1
  }
  return counts
})

const daySum = computed(() =>
  props.chores.reduce((n, c) => n + (todayCounts.value[c.id] ?? 0), 0)
)

// Streak: aufeinanderfolgende Tage mit mindestens einer erledigten Favoriten-
// Aufgabe, endend heute (oder gestern, solange der heutige Tag noch offen ist).
const streak = computed(() => {
  const favIds = new Set(props.chores.map((c) => c.id))
  const active = new Set<string>()
  for (const h of props.history) {
    if (h.completedBy !== props.currentUserId || !favIds.has(h.choreId)) continue
    const d = toDate(h.completedAt)
    if (d) active.add(dayKey(d))
  }
  if (active.size === 0) return 0

  const cursor = new Date()
  if (!active.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1)

  let count = 0
  while (active.has(dayKey(cursor))) {
    count++
    cursor.setDate(cursor.getDate() - 1)
  }
  return count
})

function tileEmoji(chore: Chore): string {
  return roomDef(roomOf(chore)).icon
}

// Ab wie vielen Taps ist der Ring voll? Chores tragen (noch) kein Ziel-Feld,
// daher Default 1 — der Ring füllt sich beim ersten Tap, der Zähler läuft weiter.
function goalOf(_chore: Chore): number {
  return 1
}

// stroke-dashoffset für den Fortschritts-Ring: voll leer bei 0, voll gefüllt
// sobald das Ziel erreicht ist. Die CSS-Transition erledigt die Animation,
// sobald todayCounts nach dem Firestore-Snapshot reaktiv nachzieht.
function ringOffset(chore: Chore): number {
  const n = todayCounts.value[chore.id] ?? 0
  const goal = goalOf(chore)
  return Math.max(0, RING_LEN * (1 - n / goal))
}

// Kurzer Feder-Pop des Emojis für unmittelbares Tap-Feedback.
const bumping = reactive<Record<string, boolean>>({})
function onTap(chore: Chore) {
  emit('tap', chore)
  bumping[chore.id] = false
  requestAnimationFrame(() => {
    bumping[chore.id] = true
    setTimeout(() => { bumping[chore.id] = false }, 260)
  })
}
</script>

<template>
  <div class="qcard">
    <div class="qhead">
      <span v-if="streak > 0" class="streak">🔥 {{ streak }} {{ streak === 1 ? 'Tag' : 'Tage' }} in Folge</span>
      <span v-else class="streak streak--muted">✨ Deine Routinen</span>
      <span class="qsum">{{ daySum }}× heute</span>
    </div>

    <div class="qgrid">
      <button
        v-for="chore in chores"
        :key="chore.id"
        type="button"
        class="qtile"
        :class="{ has: (todayCounts[chore.id] ?? 0) > 0, bump: bumping[chore.id] }"
        @click="onTap(chore)"
      >
        <span class="qring">
          <svg width="58" height="58" viewBox="0 0 58 58" aria-hidden="true">
            <circle class="qtrack" cx="29" cy="29" r="26" fill="none" stroke-width="4" />
            <circle
              class="qprog"
              cx="29"
              cy="29"
              r="26"
              fill="none"
              stroke-width="4"
              stroke-linecap="round"
              :stroke-dasharray="RING_LEN"
              :stroke-dashoffset="ringOffset(chore)"
            />
          </svg>
          <span class="qi">{{ tileEmoji(chore) }}</span>
          <span v-if="(todayCounts[chore.id] ?? 0) > 0" class="qbadge mono">{{ todayCounts[chore.id] }}</span>
        </span>
        <span class="qt">{{ chore.name }}</span>
      </button>

      <button type="button" class="qtile qtile--add" @click="emit('add')">
        <span class="qring qring--add">
          <span class="qi qi--add">＋</span>
        </span>
        <span class="qt qt--add">Neu</span>
      </button>
    </div>

    <p v-if="chores.length === 0" class="qhint">
      Noch keine Favoriten — tippe „Neu“, um Aufgaben fürs Dashboard zu verknüpfen.
    </p>
  </div>
</template>

<style scoped>
.qcard {
  background: var(--surface);
  border: 1px solid var(--border-softer);
  border-radius: var(--radius-card);
  padding: 15px;
  box-shadow: var(--shadow-card);
}

.qhead {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 14px;
}

.streak {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 800;
  color: var(--accent);
  background: color-mix(in srgb, var(--accent) 13%, var(--surface));
}

.streak--muted {
  color: var(--text-meta);
  background: var(--surface-deep);
}

.qsum {
  font-size: 13.5px;
  font-weight: 800;
  color: var(--text-secondary);
}

/* Fortschritts-Ring-Kacheln — 4 Spalten (reference: variants/schnell-aufgaben.html B) */
.qgrid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.qtile {
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 7px;
  background: none;
  border: none;
  padding: 2px 0;
  cursor: pointer;
  font-family: var(--font-body);
  transition: transform 0.12s var(--ease-overshoot);
}

.qtile:active {
  transform: scale(0.94);
}

.qring {
  position: relative;
  width: 58px;
  height: 58px;
  display: grid;
  place-items: center;
}

.qring svg {
  position: absolute;
  inset: 0;
  transform: rotate(-90deg); /* Ringstart oben */
}

.qtrack {
  stroke: var(--surface-deep);
}

.qprog {
  stroke: var(--accent);
  transition: stroke-dashoffset 0.5s var(--ease-overshoot);
}

.qi {
  font-size: 24px;
  transition: transform 0.2s var(--ease-overshoot);
}

.qtile.bump .qi {
  transform: scale(1.22);
}

.qbadge {
  position: absolute;
  bottom: -2px;
  right: -2px;
  min-width: 18px;
  height: 18px;
  padding: 0 4px;
  border-radius: 9px;
  background: var(--accent);
  color: #fff;
  font-size: 10.5px;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid var(--surface);
}

.qt {
  max-width: 100%;
  font-size: 11px;
  font-weight: 800;
  line-height: 1.15;
  text-align: center;
  color: var(--text-meta);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.qtile.has .qt {
  color: var(--text);
}

/* „Neu"-Kachel: gestrichelter Ring */
.qring--add {
  border: 2px dashed var(--border-soft);
  border-radius: 50%;
}

.qi--add {
  font-size: 20px;
  color: var(--text-meta);
}

.qt--add {
  color: var(--text-secondary);
}

.qhint {
  margin: 12px 2px 0;
  font-size: 12.5px;
  font-weight: 700;
  color: var(--text-meta);
}
</style>

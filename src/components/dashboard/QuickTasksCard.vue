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

// Kurzer Feder-Pop beim Erledigen.
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
        class="qtask"
        :class="{ has: (todayCounts[chore.id] ?? 0) > 0, bump: bumping[chore.id] }"
        @click="onTap(chore)"
      >
        <span v-if="(todayCounts[chore.id] ?? 0) > 0" class="qcount mono">{{ todayCounts[chore.id] }}×</span>
        <span class="qi">{{ tileEmoji(chore) }}</span>
        <span class="qt">{{ chore.name }}</span>
        <span class="qadd">＋</span>
      </button>

      <button type="button" class="qtask qtask--add" @click="emit('add')">
        <span class="qi qi--add">＋</span>
        <span class="qt">Auswählen</span>
      </button>
    </div>

    <p v-if="chores.length === 0" class="qhint">
      Noch keine Favoriten — tippe „Auswählen“, um Aufgaben fürs Dashboard zu verknüpfen.
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
  margin-bottom: 12px;
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

.qgrid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 10px;
}

.qtask {
  position: relative;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 9px;
  background: var(--surface);
  border: 1px solid var(--border-soft);
  border-radius: 18px;
  padding: 12px;
  cursor: pointer;
  text-align: left;
  font-family: var(--font-body);
  transition: background 0.18s var(--ease-overshoot),
              border-color 0.18s var(--ease-overshoot),
              transform 0.12s var(--ease-overshoot);
}

.qtask:active {
  transform: scale(0.97);
}

.qi {
  flex: none;
  font-size: 22px;
  transition: transform 0.2s var(--ease-overshoot);
}

.qi--add {
  font-size: 20px;
  color: var(--accent);
}

.qt {
  flex: 1;
  min-width: 0;
  font-size: 13.5px;
  font-weight: 800;
  line-height: 1.15;
  color: var(--text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.qadd {
  width: 30px;
  height: 30px;
  border-radius: 10px;
  background: var(--surface-deep);
  color: var(--accent);
  flex: none;
  display: grid;
  place-items: center;
  font-size: 20px;
  transition: background 0.2s var(--ease-overshoot), color 0.2s var(--ease-overshoot);
}

.qcount {
  position: absolute;
  top: -8px;
  right: -8px;
  min-width: 23px;
  height: 23px;
  padding: 0 6px;
  border-radius: 12px;
  background: var(--accent);
  color: #fff;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 6px color-mix(in srgb, var(--accent) 45%, transparent);
}

.qtask.has {
  background: color-mix(in srgb, var(--accent) 12%, var(--surface));
  border-color: color-mix(in srgb, var(--accent) 30%, transparent);
}

.qtask.has .qadd {
  background: var(--accent);
  color: #fff;
}

.qtask.bump .qi {
  transform: scale(1.2);
}

.qtask--add {
  border-style: dashed;
  justify-content: center;
  color: var(--text-secondary);
}

.qhint {
  margin: 12px 2px 0;
  font-size: 12.5px;
  font-weight: 700;
  color: var(--text-meta);
}
</style>

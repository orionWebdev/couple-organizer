<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Chore, ChoreAssignee, ChoreRoom, Couple } from '@/types'
import TaskRowAll from './TaskRowAll.vue'
import { useJustAdded } from '@/composables/useJustAdded'
import { ROOMS, roomOf } from '@/utils/rooms'

const props = defineProps<{
  chores: readonly Chore[]
  couple: Couple | null
  todayCounts: ReadonlyMap<string, number>
}>()

const emit = defineEmits<{
  pick: [chore: Chore, assignee: ChoreAssignee]
  undo: [chore: Chore]
  assign: [chore: Chore, assignee: ChoreAssignee]
  edit: [chore: Chore]
  delete: [chore: Chore]
  seed: []
}>()

const roomFilter = ref<ChoreRoom | 'alle'>('alle')
const search = ref('')
const menuOpenId = ref<string | null>(null)

// Eine erledigte einmalige Aufgabe verlässt den Pool endgültig — sie steht ab
// dann nur noch im Verlauf. Wiederkehrende Aufgaben bleiben immer im Pool.
const poolChores = computed(() =>
  props.chores.filter((c) => !(c.type === 'once' && c.done))
)

// Anzahl Aufgaben je Raum, damit leere Räume ausgeblendet werden können.
const roomCounts = computed(() => {
  const counts = new Map<ChoreRoom, number>()
  for (const c of poolChores.value) {
    const r = roomOf(c)
    counts.set(r, (counts.get(r) ?? 0) + 1)
  }
  return counts
})

const activeRooms = computed(() => ROOMS.filter((r) => (roomCounts.value.get(r.id) ?? 0) > 0))

const filtered = computed(() => {
  let list = poolChores.value.slice()

  if (roomFilter.value !== 'alle') list = list.filter((c) => roomOf(c) === roomFilter.value)

  const q = search.value.trim().toLowerCase()
  if (q) list = list.filter((c) => c.name.toLowerCase().includes(q))

  return list
})

function toggleMenu(id: string) {
  menuOpenId.value = menuOpenId.value === id ? null : id
}

const { justAdded } = useJustAdded(() => filtered.value, c => c.id)
</script>

<template>
  <div class="alle">
    <div class="pool-head">
      <span class="pool-label">Aufgaben-Pool</span>
    </div>

    <div class="pool-search-wrap">
      <span class="pool-search-icon" aria-hidden="true">🔍</span>
      <input
        v-model="search"
        class="app-field pool-search"
        type="text"
        placeholder="Aufgabe suchen…"
      />
    </div>

    <div class="room-row" data-hswipe-skip>
      <button
        class="room-chip"
        :class="{ 'room-chip--active': roomFilter === 'alle' }"
        @click="roomFilter = 'alle'"
      >Alle Räume</button>
      <button
        v-for="r in activeRooms"
        :key="r.id"
        class="room-chip room-chip--icon"
        :class="{ 'room-chip--active': roomFilter === r.id }"
        :title="r.label"
        @click="roomFilter = r.id"
      >
        <span class="room-chip__icon" aria-hidden="true">{{ r.icon }}</span>
        <span class="room-chip__label">{{ r.label }}</span>
      </button>
    </div>

    <div v-if="poolChores.length === 0" class="empty empty--seed">
      <p class="empty-text">Noch keine Aufgaben im Pool.</p>
      <button class="seed-btn" @click="emit('seed')">Standardaufgaben laden</button>
    </div>
    <div v-else-if="filtered.length === 0" class="empty">Hier ist gerade nichts. Schön ruhig. ✓</div>
    <TransitionGroup v-else tag="div" name="list-add" class="list">
      <TaskRowAll
        v-for="c in filtered"
        :key="c.id"
        :chore="c"
        :couple="couple"
        :menuOpen="menuOpenId === c.id"
        :todayCount="todayCounts.get(c.id) ?? 0"
        :class="{ 'just-added': justAdded.has(c.id) }"
        @pick="emit('pick', c, $event)"
        @undo="emit('undo', c)"
        @toggleMenu="toggleMenu(c.id)"
        @assign="emit('assign', c, $event)"
        @edit="emit('edit', c)"
        @delete="emit('delete', c)"
      />
    </TransitionGroup>

    <button v-if="poolChores.length > 0" class="seed-link" @click="emit('seed')">
      Standardaufgaben ergänzen
    </button>
  </div>
</template>

<style scoped>
.alle {
  padding: 0 var(--screen-pad);
}

.pool-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.pool-label {
  font-size: 13px;
  font-weight: 700;
  color: var(--text);
}

/* Volle Breite, Eingabe-Stil wie in den Modals (.app-field) */
.pool-search-wrap {
  position: relative;
  width: 100%;
  margin-bottom: 14px;
}

.pool-search-icon {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 14px;
  line-height: 1;
  pointer-events: none;
  opacity: 0.7;
}

.pool-search {
  width: 100%;
  padding-left: 40px;
}

/* Einziger Filter im Pool — darf etwas mehr Platz einnehmen. */
.room-row {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 2px;
  margin-bottom: 14px;
}

.room-chip {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-family: var(--font-body);
  font-size: 14px;
  font-weight: 700;
  padding: 9px 15px;
  border-radius: 100px;
  border: 1px solid var(--border-softer);
  background: var(--surface);
  color: var(--text-meta);
  cursor: pointer;
  white-space: nowrap;
  box-shadow: var(--shadow-card);
}

.room-chip__icon {
  font-size: 17px;
  line-height: 1;
}

.room-chip--active {
  border-color: var(--accent);
  background: var(--accent-tint);
  color: var(--text);
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

.empty--seed {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
}

.empty-text {
  margin: 0;
}

.seed-btn {
  font-family: var(--font-body);
  font-size: 14px;
  font-weight: 700;
  padding: 11px 20px;
  border-radius: 100px;
  border: none;
  background: var(--accent);
  color: var(--on-accent);
  cursor: pointer;
  box-shadow: var(--shadow-accent);
}

.seed-btn:active {
  background: var(--accent-hover);
}

.seed-link {
  display: block;
  margin: 18px auto 4px;
  font-family: var(--font-body);
  font-size: 12.5px;
  font-weight: 600;
  padding: 8px 16px;
  border-radius: 100px;
  border: 1px dashed var(--border-softer);
  background: transparent;
  color: var(--text-meta);
  cursor: pointer;
}
</style>

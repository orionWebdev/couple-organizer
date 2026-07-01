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

type Filter = 'alle' | 'personA' | 'personB' | 'both' | 'offen'
const filter = ref<Filter>('alle')
const roomFilter = ref<ChoreRoom | 'alle'>('alle')
const showSearch = ref(false)
const search = ref('')
const menuOpenId = ref<string | null>(null)

const personA = computed(() => props.couple?.memberIds[0] ?? null)
const personB = computed(() => props.couple?.memberIds[1] ?? null)
const personAName = computed(() => props.couple?.memberNames[personA.value ?? ''] ?? 'Person A')
const personBName = computed(() => props.couple?.memberNames[personB.value ?? ''] ?? 'Person B')

// Anzahl Aufgaben je Raum, damit leere Räume ausgeblendet werden können.
const roomCounts = computed(() => {
  const counts = new Map<ChoreRoom, number>()
  for (const c of props.chores) {
    const r = roomOf(c)
    counts.set(r, (counts.get(r) ?? 0) + 1)
  }
  return counts
})

const activeRooms = computed(() => ROOMS.filter((r) => (roomCounts.value.get(r.id) ?? 0) > 0))

const filtered = computed(() => {
  let list = props.chores.slice()

  if (filter.value === 'personA') list = list.filter((c) => c.assignee === personA.value)
  else if (filter.value === 'personB') list = list.filter((c) => c.assignee === personB.value)
  else if (filter.value === 'both') list = list.filter((c) => c.assignee === 'both')
  else if (filter.value === 'offen') list = list.filter((c) => c.assignee === null)

  if (roomFilter.value !== 'alle') list = list.filter((c) => roomOf(c) === roomFilter.value)

  const q = search.value.trim().toLowerCase()
  if (q) list = list.filter((c) => c.name.toLowerCase().includes(q))

  return list
})

function toggleSearch() {
  showSearch.value = !showSearch.value
  if (!showSearch.value) search.value = ''
}

function toggleMenu(id: string) {
  menuOpenId.value = menuOpenId.value === id ? null : id
}

const { justAdded } = useJustAdded(() => filtered.value, c => c.id)
</script>

<template>
  <div class="alle">
    <div class="pool-head">
      <span class="pool-label">Aufgaben-Pool</span>
      <button class="search-toggle" :class="{ 'search-toggle--active': showSearch }" @click="toggleSearch">
        Suche <span aria-hidden="true">🔍</span>
      </button>
    </div>

    <input
      v-if="showSearch"
      v-model="search"
      class="app-field pool-search"
      type="text"
      placeholder="Aufgabe suchen…"
    />

    <div class="room-row">
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

    <div class="filter-row">
      <button class="filter-chip" :class="{ 'filter-chip--active': filter === 'alle' }" @click="filter = 'alle'">Alle</button>
      <button class="filter-chip" :class="{ 'filter-chip--active': filter === 'personA' }" @click="filter = 'personA'">{{ personAName }}</button>
      <button class="filter-chip" :class="{ 'filter-chip--active': filter === 'personB' }" @click="filter = 'personB'">{{ personBName }}</button>
      <button class="filter-chip" :class="{ 'filter-chip--active': filter === 'both' }" @click="filter = 'both'">Beide</button>
      <button class="filter-chip filter-chip--offen" :class="{ 'filter-chip--offen-active': filter === 'offen' }" @click="filter = 'offen'">Offen</button>
    </div>

    <div v-if="chores.length === 0" class="empty empty--seed">
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

    <button v-if="chores.length > 0" class="seed-link" @click="emit('seed')">
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

.search-toggle {
  font-family: 'Mali', system-ui, sans-serif;
  font-size: 12px;
  font-weight: 600;
  padding: 6px 12px;
  border-radius: 100px;
  border: 1px solid var(--border-softer);
  background: transparent;
  color: var(--text-meta);
  cursor: pointer;
}

.search-toggle--active {
  border-color: var(--accent);
  background: var(--accent-tint);
  color: var(--text);
}

.pool-search {
  margin-bottom: 12px;
}

.room-row {
  display: flex;
  gap: 7px;
  overflow-x: auto;
  padding-bottom: 2px;
  margin-bottom: 12px;
}

.room-chip {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: 'Mali', system-ui, sans-serif;
  font-size: 12.5px;
  font-weight: 600;
  padding: 7px 12px;
  border-radius: 100px;
  border: 1px solid var(--border-softer);
  background: transparent;
  color: var(--text-meta);
  cursor: pointer;
  white-space: nowrap;
}

.room-chip__icon {
  font-size: 15px;
  line-height: 1;
}

.room-chip--active {
  border-color: var(--accent);
  background: var(--accent-tint);
  color: var(--text);
}

.filter-row {
  display: flex;
  gap: 7px;
  overflow-x: auto;
  padding-bottom: 2px;
  margin-bottom: 14px;
}

.filter-chip {
  flex-shrink: 0;
  font-family: 'Mali', system-ui, sans-serif;
  font-size: 12.5px;
  font-weight: 600;
  padding: 7px 13px;
  border-radius: 9px;
  border: 1px solid var(--border-softer);
  background: transparent;
  color: var(--text-meta);
  cursor: pointer;
  white-space: nowrap;
}

.filter-chip--active {
  border-color: var(--accent);
  background: var(--accent-tint);
  color: var(--text);
}

.filter-chip--offen {
  border-style: dashed;
  border-color: var(--danger-border);
  color: var(--danger);
}

.filter-chip--offen-active {
  border-color: var(--danger);
  background: var(--danger-tint);
  color: var(--text);
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
  font-family: 'Mali', system-ui, sans-serif;
  font-size: 14px;
  font-weight: 600;
  padding: 11px 20px;
  border-radius: 100px;
  border: none;
  background: var(--accent);
  color: var(--on-accent);
  cursor: pointer;
}

.seed-btn:active {
  background: var(--accent-hover);
}

.seed-link {
  display: block;
  margin: 18px auto 4px;
  font-family: 'Mali', system-ui, sans-serif;
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

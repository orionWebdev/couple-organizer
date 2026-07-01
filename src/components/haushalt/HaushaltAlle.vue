<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Chore, ChoreAssignee, Couple } from '@/types'
import TaskRowAll from './TaskRowAll.vue'

const props = defineProps<{
  chores: readonly Chore[]
  couple: Couple | null
}>()

const emit = defineEmits<{
  pick: [chore: Chore, assignee: ChoreAssignee]
  undo: [chore: Chore]
  assign: [chore: Chore, assignee: ChoreAssignee]
  edit: [chore: Chore]
  delete: [chore: Chore]
}>()

type Filter = 'alle' | 'personA' | 'personB' | 'both' | 'offen'
const filter = ref<Filter>('alle')
const menuOpenId = ref<string | null>(null)

const personA = computed(() => props.couple?.memberIds[0] ?? null)
const personB = computed(() => props.couple?.memberIds[1] ?? null)
const personAName = computed(() => props.couple?.memberNames[personA.value ?? ''] ?? 'Person A')
const personBName = computed(() => props.couple?.memberNames[personB.value ?? ''] ?? 'Person B')

const filtered = computed(() => {
  if (filter.value === 'alle') return props.chores
  if (filter.value === 'personA') return props.chores.filter((c) => c.assignee === personA.value)
  if (filter.value === 'personB') return props.chores.filter((c) => c.assignee === personB.value)
  if (filter.value === 'both') return props.chores.filter((c) => c.assignee === 'both')
  return props.chores.filter((c) => c.assignee === null)
})

function toggleMenu(id: string) {
  menuOpenId.value = menuOpenId.value === id ? null : id
}
</script>

<template>
  <div class="alle">
    <div class="filter-row">
      <button class="filter-chip" :class="{ 'filter-chip--active': filter === 'alle' }" @click="filter = 'alle'">Alle</button>
      <button class="filter-chip" :class="{ 'filter-chip--active': filter === 'personA' }" @click="filter = 'personA'">{{ personAName }}</button>
      <button class="filter-chip" :class="{ 'filter-chip--active': filter === 'personB' }" @click="filter = 'personB'">{{ personBName }}</button>
      <button class="filter-chip" :class="{ 'filter-chip--active': filter === 'both' }" @click="filter = 'both'">Beide</button>
      <button class="filter-chip filter-chip--offen" :class="{ 'filter-chip--offen-active': filter === 'offen' }" @click="filter = 'offen'">Offen</button>
    </div>

    <div v-if="filtered.length === 0" class="empty">Hier ist gerade nichts. Schön ruhig. ✓</div>
    <div v-else class="list">
      <TaskRowAll
        v-for="c in filtered"
        :key="c.id"
        :chore="c"
        :couple="couple"
        :menuOpen="menuOpenId === c.id"
        @pick="emit('pick', c, $event)"
        @undo="emit('undo', c)"
        @toggleMenu="toggleMenu(c.id)"
        @assign="emit('assign', c, $event)"
        @edit="emit('edit', c)"
        @delete="emit('delete', c)"
      />
    </div>
  </div>
</template>

<style scoped>
.alle {
  padding: 0 var(--screen-pad);
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
</style>

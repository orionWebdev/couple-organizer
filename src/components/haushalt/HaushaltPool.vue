<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Todo, Couple } from '@/types'
import ChoreRow from './ChoreRow.vue'
import QuickActionsGrid from './QuickActionsGrid.vue'

const props = defineProps<{
  todos: readonly Todo[]
  couple: Couple | null
  currentUserId: string
}>()

const emit = defineEmits<{
  toggle: [id: string, done: boolean]
  delete: [id: string]
  add: [title: string]
}>()

const filter = ref<'all' | 'mine' | 'partner'>('all')

const partnerUid = computed(() => {
  if (!props.couple) return null
  return props.couple.memberIds.find(id => id !== props.currentUserId) ?? null
})

const openTodos = computed(() =>
  props.todos.filter(t => !t.done)
)

const filtered = computed(() => {
  if (filter.value === 'mine') return openTodos.value.filter(t => t.assignedTo === props.currentUserId)
  if (filter.value === 'partner' && partnerUid.value) return openTodos.value.filter(t => t.assignedTo === partnerUid.value)
  return openTodos.value
})

const openCount = computed(() => openTodos.value.length)
</script>

<template>
  <div class="pool">
    <QuickActionsGrid @action="(t) => emit('add', t)" />

    <!-- Filter chips -->
    <div class="filter-row">
      <button
        class="filter-chip"
        :class="{ 'filter-chip--active': filter === 'all' }"
        @click="filter = 'all'"
      >
        Alle
      </button>
      <button
        class="filter-chip"
        :class="{ 'filter-chip--active': filter === 'mine' }"
        @click="filter = 'mine'"
      >
        Für mich
      </button>
      <button
        v-if="partnerUid"
        class="filter-chip"
        :class="{ 'filter-chip--active': filter === 'partner' }"
        @click="filter = 'partner'"
      >
        Für {{ couple?.memberNames[partnerUid] ?? 'Partner' }}
      </button>
      <span class="open-chip">{{ openCount }} offen</span>
    </div>

    <!-- List -->
    <div v-if="filtered.length === 0" class="empty">
      Keine offenen Aufgaben.
    </div>
    <div v-else class="chore-list">
      <ChoreRow
        v-for="t in filtered"
        :key="t.id"
        :todo="t"
        :couple="couple"
        @toggle="emit('toggle', t.id, !t.done)"
        @delete="emit('delete', t.id)"
      />
    </div>
  </div>
</template>

<style scoped>
.pool {}

.filter-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 var(--screen-pad);
  margin-bottom: 16px;
  overflow-x: auto;
}

.filter-chip {
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

.filter-chip--active {
  background: var(--accent-tint);
  border-color: var(--accent);
  color: var(--accent);
}

.open-chip {
  padding: 6px 14px;
  background: var(--danger-tint);
  border: 1px dashed var(--sarah);
  border-radius: 100px;
  color: var(--sarah);
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
  flex-shrink: 0;
  margin-left: auto;
}

.empty {
  padding: 40px var(--screen-pad);
  font-size: 14px;
  color: var(--text-faint);
  text-align: center;
}

.chore-list {
  border-top: 1px solid var(--border-softer);
}
</style>

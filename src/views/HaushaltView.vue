<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAuth } from '@/composables/useAuth'
import { useCouple } from '@/composables/useCouple'
import { useTodos } from '@/composables/useTodos'
import { showToast } from '@/composables/useToast'
import SegmentToggle from '@/components/ui/SegmentToggle.vue'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import HaushaltPool from '@/components/haushalt/HaushaltPool.vue'
import HaushaltStatistik from '@/components/haushalt/HaushaltStatistik.vue'
import HaushaltVerlauf from '@/components/haushalt/HaushaltVerlauf.vue'

const { user } = useAuth()
const { couple } = useCouple()

const coupleId = computed(() => user.value?.coupleId ?? null)
const { todos, loading, addTodo, toggleTodo, deleteTodo } = useTodos(coupleId)

const view = ref<'pool' | 'statistik' | 'verlauf'>('pool')
const viewOptions = [
  { label: 'Pool', value: 'pool' },
  { label: 'Statistik', value: 'statistik' },
  { label: 'Verlauf', value: 'verlauf' },
]

const showAdd = ref(false)
const newChoreTitle = ref('')

async function handleAdd(title: string) {
  await addTodo(title, { assignedTo: user.value?.uid ?? null })
  showToast(`"${title}" hinzugefügt`)
}

async function handleAddCustom() {
  if (!newChoreTitle.value.trim()) return
  await addTodo(newChoreTitle.value.trim(), { assignedTo: user.value?.uid ?? null })
  showToast('Aufgabe hinzugefügt')
  newChoreTitle.value = ''
  showAdd.value = false
}

async function onToggle(id: string, done: boolean) {
  await toggleTodo(id, done)
  if (done) showToast('Erledigt!')
}

async function onDelete(id: string) {
  await deleteTodo(id)
  showToast('Aufgabe gelöscht')
}
</script>

<template>
  <div class="haushalt-page">
    <!-- Header -->
    <div class="page-header">
      <h1 class="page-title">Haushalt</h1>
      <SegmentToggle v-model="view" :options="viewOptions" />
    </div>

    <div v-if="loading" class="loading-msg">Laden…</div>
    <template v-else>
      <HaushaltPool
        v-if="view === 'pool'"
        :todos="todos"
        :couple="couple"
        :currentUserId="user?.uid ?? ''"
        @toggle="onToggle"
        @delete="onDelete"
        @add="handleAdd"
      />
      <HaushaltStatistik
        v-else-if="view === 'statistik'"
        :todos="todos"
        :couple="couple"
        :currentUserId="user?.uid ?? ''"
      />
      <HaushaltVerlauf
        v-else-if="view === 'verlauf'"
        :todos="todos"
        :couple="couple"
        @delete="onDelete"
      />
    </template>

    <!-- FAB for custom chore -->
    <button v-if="view === 'pool'" class="fab" @click="showAdd = true">Aufgabe +</button>

    <!-- Add custom chore sheet -->
    <BottomSheet :isOpen="showAdd" title="Neue Aufgabe" @close="showAdd = false">
      <input
        v-model="newChoreTitle"
        class="app-field"
        type="text"
        placeholder="Titel der Aufgabe"
        @keyup.enter="handleAddCustom"
      />
      <button class="btn-primary" :disabled="!newChoreTitle.trim()" @click="handleAddCustom">
        Hinzufügen
      </button>
    </BottomSheet>
  </div>
</template>

<style scoped>
.haushalt-page {
  min-height: 100%;
  padding-bottom: 24px;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: calc(var(--safe-top) + 20px) var(--screen-pad) 20px;
}

.page-title {
  font-size: 22px;
  font-weight: 600;
  color: var(--text);
  margin: 0;
}

.loading-msg {
  padding: 40px var(--screen-pad);
  font-size: 14px;
  color: var(--text-faint);
  text-align: center;
}

.fab {
  position: fixed;
  bottom: calc(72px + var(--safe-bottom));
  right: 22px;
  padding: 13px 20px;
  background: var(--accent);
  color: #14110d;
  border: none;
  border-radius: 100px;
  font-family: 'Hanken Grotesk', system-ui, sans-serif;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
  transition: background 0.18s ease, transform 0.12s ease;
  z-index: 50;
}

.fab:active {
  background: var(--accent-hover);
  transform: scale(0.96);
}
</style>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAuth } from '@/composables/useAuth'
import { useCouple } from '@/composables/useCouple'
import { useChores } from '@/composables/useChores'
import { showToast } from '@/composables/useToast'
import SegmentToggle from '@/components/ui/SegmentToggle.vue'
import TaskSheet from '@/components/haushalt/TaskSheet.vue'
import HaushaltHeute from '@/components/haushalt/HaushaltHeute.vue'
import HaushaltAlle from '@/components/haushalt/HaushaltAlle.vue'
import HaushaltUebersicht from '@/components/haushalt/HaushaltUebersicht.vue'
import HaushaltVerlauf from '@/components/haushalt/HaushaltVerlauf.vue'
import type { Chore, ChoreAssignee, ChoreHistoryEntry } from '@/types'

const { user } = useAuth()
const { couple } = useCouple()

const coupleId = computed(() => user.value?.coupleId ?? null)
const {
  chores,
  history,
  loading,
  addChore,
  updateChore,
  deleteChore,
  reassignChore,
  completeChore,
  undoChore,
  reassignHistoryEntry,
  deleteHistoryEntry
} = useChores(coupleId)

const tab = ref<'heute' | 'alle' | 'uebersicht' | 'verlauf'>('heute')
const tabOptions = [
  { label: 'Heute', value: 'heute' },
  { label: 'Alle', value: 'alle' },
  { label: 'Übersicht', value: 'uebersicht' },
  { label: 'Verlauf', value: 'verlauf' },
]

const showSheet = ref(false)
const editingChore = ref<Chore | null>(null)

function openNewChore() {
  editingChore.value = null
  showSheet.value = true
}

function openEditChore(chore: Chore) {
  editingChore.value = chore
  showSheet.value = true
}

async function onSheetSubmit(payload: Parameters<typeof addChore>[0]) {
  if (editingChore.value) {
    await updateChore(editingChore.value.id, payload)
    showToast('Änderungen gespeichert')
  } else {
    await addChore(payload)
    showToast('Aufgabe angelegt')
  }
  showSheet.value = false
}

async function onPick(chore: Chore, assignee: ChoreAssignee) {
  await completeChore(chore, assignee)
  showToast('Erledigt!')
}

async function onUndo(chore: Chore) {
  await undoChore(chore)
}

async function onAssign(chore: Chore, assignee: ChoreAssignee) {
  await reassignChore(chore.id, assignee)
  showToast('Aufgabe übertragen')
}

async function onDelete(chore: Chore) {
  await deleteChore(chore.id)
  showToast('Aufgabe gelöscht')
}

async function onHistoryAssign(entry: ChoreHistoryEntry, assignee: ChoreAssignee) {
  await reassignHistoryEntry(entry.id, assignee)
  showToast('Eintrag übertragen')
}

async function onHistoryDelete(entry: ChoreHistoryEntry) {
  await deleteHistoryEntry(entry.id)
  showToast('Eintrag gelöscht')
}
</script>

<template>
  <div class="haushalt-page">
    <div class="page-header">
      <h1 class="page-title">Haushalt</h1>
    </div>
    <div class="tab-bar-wrap">
      <SegmentToggle v-model="tab" :options="tabOptions" class="tab-bar" />
    </div>

    <div v-if="loading" class="loading-msg">Laden…</div>
    <template v-else>
      <HaushaltHeute
        v-if="tab === 'heute'"
        :chores="chores"
        :couple="couple"
        :currentUserId="user?.uid ?? ''"
        @pick="onPick"
        @undo="onUndo"
      />
      <HaushaltAlle
        v-else-if="tab === 'alle'"
        :chores="chores"
        :couple="couple"
        @pick="onPick"
        @undo="onUndo"
        @assign="onAssign"
        @edit="openEditChore"
        @delete="onDelete"
      />
      <HaushaltUebersicht
        v-else-if="tab === 'uebersicht'"
        :chores="chores"
        :history="history"
        :couple="couple"
      />
      <HaushaltVerlauf
        v-else
        :history="history"
        :couple="couple"
        @assign="onHistoryAssign"
        @delete="onHistoryDelete"
      />
    </template>

    <button v-if="tab === 'alle'" class="fab" @click="openNewChore">Aufgabe +</button>

    <TaskSheet
      :isOpen="showSheet"
      :couple="couple"
      :editingChore="editingChore"
      @close="showSheet = false"
      @submit="onSheetSubmit"
    />
  </div>
</template>

<style scoped>
.haushalt-page {
  min-height: 100%;
  padding-bottom: 24px;
}

.page-header {
  padding: calc(var(--safe-top) + 20px) var(--screen-pad) 16px;
}

.page-title {
  font-size: 22px;
  font-weight: 600;
  color: var(--text);
  margin: 0;
}

.tab-bar-wrap {
  padding: 0 var(--screen-pad);
  margin-bottom: 20px;
}

.tab-bar {
  display: flex;
  width: 100%;
  gap: 4px;
  border-radius: 12px;
  padding: 4px;
}

.tab-bar :deep(.seg-btn) {
  flex: 1;
  padding: 9px 0;
  font-size: 12px;
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

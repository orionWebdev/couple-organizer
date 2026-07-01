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
import { isSameDay } from '@/utils/chores'
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

// How many times each chore was completed today — drives the repeat-count
// badge on recurring tasks.
const todayCounts = computed(() => {
  const counts = new Map<string, number>()
  const now = new Date()
  for (const entry of history.value) {
    const date = (entry.completedAt as any)?.toDate?.() ?? null
    if (date && isSameDay(date, now)) {
      counts.set(entry.choreId, (counts.get(entry.choreId) ?? 0) + 1)
    }
  }
  return counts
})

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

const FAILURE_MESSAGE = 'Fehler beim Speichern — bitte erneut versuchen'

async function onSheetSubmit(payload: Parameters<typeof addChore>[0]) {
  const ok = editingChore.value
    ? await updateChore(editingChore.value.id, payload)
    : await addChore(payload)

  if (!ok) {
    showToast(FAILURE_MESSAGE)
    return
  }
  showToast(editingChore.value ? 'Änderungen gespeichert' : 'Aufgabe angelegt')
  showSheet.value = false
}

async function onPick(chore: Chore, assignee: ChoreAssignee) {
  const ok = await completeChore(chore, assignee)
  showToast(ok ? 'Erledigt!' : FAILURE_MESSAGE)
}

async function onUndo(chore: Chore) {
  const ok = await undoChore(chore)
  if (!ok) showToast(FAILURE_MESSAGE)
}

async function onAssign(chore: Chore, assignee: ChoreAssignee) {
  const ok = await reassignChore(chore.id, assignee)
  showToast(ok ? 'Aufgabe übertragen' : FAILURE_MESSAGE)
}

async function onDelete(chore: Chore) {
  const ok = await deleteChore(chore.id)
  showToast(ok ? 'Aufgabe gelöscht' : FAILURE_MESSAGE)
}

async function onHistoryAssign(entry: ChoreHistoryEntry, assignee: ChoreAssignee) {
  const ok = await reassignHistoryEntry(entry.id, assignee)
  showToast(ok ? 'Eintrag übertragen' : FAILURE_MESSAGE)
}

async function onHistoryDelete(entry: ChoreHistoryEntry) {
  const ok = await deleteHistoryEntry(entry.id)
  showToast(ok ? 'Eintrag gelöscht' : FAILURE_MESSAGE)
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
        :todayCounts="todayCounts"
        @pick="onPick"
        @undo="onUndo"
      />
      <HaushaltAlle
        v-else-if="tab === 'alle'"
        :chores="chores"
        :couple="couple"
        :todayCounts="todayCounts"
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
  font-family: var(--font-headline);
  font-size: 28px;
  font-weight: 700;
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
  border-radius: 12px;
}

.tab-bar :deep(.seg-btn) {
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
  color: var(--on-accent);
  border: none;
  border-radius: 100px;
  font-family: 'Mali', system-ui, sans-serif;
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

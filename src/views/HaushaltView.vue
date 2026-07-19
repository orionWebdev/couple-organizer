<script setup lang="ts">
import { ref, computed, watch, onScopeDispose } from 'vue'
import { useAuth } from '@/composables/useAuth'
import { useCouple } from '@/composables/useCouple'
import { useChores } from '@/composables/useChores'
import { setFabAction } from '@/composables/useFab'
import { useTabSwipe } from '@/composables/useTabSwipe'
import { showToast } from '@/composables/useToast'
import SegmentToggle from '@/components/ui/SegmentToggle.vue'
import ProfileButton from '@/components/ui/ProfileButton.vue'
import TaskSheet from '@/components/haushalt/TaskSheet.vue'
import FairDistributeSheet from '@/components/haushalt/FairDistributeSheet.vue'
import { showPaywall } from '@/composables/usePaywall'
import HaushaltZuweisungen from '@/components/haushalt/HaushaltZuweisungen.vue'
import HaushaltAlle from '@/components/haushalt/HaushaltAlle.vue'
import HaushaltUebersicht from '@/components/haushalt/HaushaltUebersicht.vue'
import { usePersistedRef, DRAFT_TTL_MS } from '@/composables/usePersistedRef'
import { isSameDay } from '@/utils/chores'
import type { Chore, ChoreAssignee, ChoreHistoryEntry } from '@/types'

const { user } = useAuth()
const { couple, isPremium } = useCouple()

const coupleId = computed(() => user.value?.coupleId ?? null)
const {
  chores,
  history,
  loading,
  addChore,
  seedPool,
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

type Tab = 'zuweisungen' | 'alle' | 'uebersicht'
// Standard-Landing im Haushalt ist „Zuweisungen" — direkter Blick auf die
// eigenen offenen Aufgaben.
const tab = usePersistedRef<Tab>('haushalt.tab', 'zuweisungen')
const tabOptions = [
  { label: 'Zuweisungen', value: 'zuweisungen' },
  { label: 'Alle', value: 'alle' },
  { label: 'Übersicht', value: 'uebersicht' },
]

// Reihenfolge muss die sichtbare Tab-Reihenfolge widerspiegeln.
const order: Tab[] = ['zuweisungen', 'alle', 'uebersicht']
const { onTouchStart, onTouchMove, onTouchEnd } = useTabSwipe(order, tab)

// Offener Sheet überlebt den Kaltstart (TTL); die bearbeitete Aufgabe wird über
// ihre ID zurückgeholt, sobald die Aufgaben geladen sind.
const showSheet = usePersistedRef('haushalt.showSheet', false, { ttlMs: DRAFT_TTL_MS })
const editingChoreId = usePersistedRef<string | null>('haushalt.editChoreId', null, { ttlMs: DRAFT_TTL_MS })
const editingChore = ref<Chore | null>(null)

const stopChoreRestore = watch(
  () => loading.value,
  (busy) => {
    if (busy) return
    if (editingChoreId.value) {
      editingChore.value = chores.value.find((c) => c.id === editingChoreId.value) ?? null
      if (showSheet.value && !editingChore.value) { showSheet.value = false; editingChoreId.value = null }
    }
    stopChoreRestore()
  },
  { immediate: true }
)

function closeSheet() {
  showSheet.value = false
  editingChore.value = null
  editingChoreId.value = null
}

function openNewChore() {
  editingChore.value = null
  editingChoreId.value = null
  showSheet.value = true
}

// Globaler FAB (App-Shell): nur der Aufgaben-Pool ("Alle") kennt ein Add.
watch(tab, (t) => {
  setFabAction(t === 'alle' ? { label: 'Aufgabe hinzufügen', handler: openNewChore } : null)
}, { immediate: true })
onScopeDispose(() => setFabAction(null))

function openEditChore(chore: Chore) {
  editingChore.value = chore
  editingChoreId.value = chore.id
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
  closeSheet()
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

async function onSeed() {
  const added = await seedPool()
  if (added < 0) showToast(FAILURE_MESSAGE)
  else if (added === 0) showToast('Alle Standardaufgaben sind bereits im Pool')
  else showToast(`${added} Aufgabe${added === 1 ? '' : 'n'} hinzugefügt`)
}

async function onHistoryAssign(entry: ChoreHistoryEntry, assignee: ChoreAssignee) {
  const ok = await reassignHistoryEntry(entry.id, assignee)
  showToast(ok ? 'Eintrag übertragen' : FAILURE_MESSAGE)
}

async function onHistoryDelete(entry: ChoreHistoryEntry) {
  const ok = await deleteHistoryEntry(entry.id)
  showToast(ok ? 'Eintrag gelöscht' : FAILURE_MESSAGE)
}

// Faire Aufgabenverteilung (TwoDo Plus). Composable erzwingt nichts hier — die
// View öffnet die Paywall, wenn nicht Premium (Hausmuster).
const showFair = ref(false)

function openFair() {
  if (!isPremium.value) {
    showPaywall('choreBalance')
    return
  }
  showFair.value = true
}

async function applyDistribution(changes: { choreId: string; to: string }[]): Promise<number> {
  let n = 0
  for (const c of changes) {
    if (await reassignChore(c.choreId, c.to)) n++
  }
  return n
}

function onFairApplied(count: number) {
  showFair.value = false
  showToast(count > 0 ? `${count} Aufgabe${count === 1 ? '' : 'n'} neu verteilt` : 'Nichts geändert')
}
</script>

<template>
  <div class="haushalt-page area-haushalt">
    <div class="page-header">
      <h1 class="page-title">Haushalt</h1>
      <ProfileButton />
    </div>
    <div class="tab-bar-wrap">
      <SegmentToggle v-model="tab" :options="tabOptions" class="tab-bar" />
    </div>

    <div v-if="tab === 'zuweisungen' && !loading" class="fair-row">
      <button class="fair-btn" type="button" @click="openFair">
        ⚖️ Aufgaben fair verteilen
        <span v-if="!isPremium" class="plus-tag">Plus</span>
      </button>
    </div>

    <div v-if="loading" class="loading-msg">Laden…</div>
    <div
      v-else
      class="tab-content"
      @touchstart.passive="onTouchStart"
      @touchmove.passive="onTouchMove"
      @touchend.passive="onTouchEnd"
      @touchcancel.passive="onTouchEnd"
    >
      <Transition :name="'tab-fade'" mode="out-in">
        <HaushaltZuweisungen
          v-if="tab === 'zuweisungen'"
          key="zuweisungen"
          class="rise-stagger"
          :chores="chores"
          :history="history"
          :couple="couple"
          :currentUserId="user?.uid ?? ''"
          :todayCounts="todayCounts"
          @pick="onPick"
          @undo="onUndo"
        />
        <HaushaltAlle
          v-else-if="tab === 'alle'"
          key="alle"
          class="rise-stagger"
          :chores="chores"
          :couple="couple"
          :todayCounts="todayCounts"
          @pick="onPick"
          @undo="onUndo"
          @assign="onAssign"
          @edit="openEditChore"
          @delete="onDelete"
          @seed="onSeed"
        />
        <HaushaltUebersicht
          v-else
          key="uebersicht"
          class="rise-stagger"
          :chores="chores"
          :history="history"
          :couple="couple"
          @assign="onHistoryAssign"
          @delete="onHistoryDelete"
        />
      </Transition>
    </div>

    <TaskSheet
      :isOpen="showSheet"
      :couple="couple"
      :editingChore="editingChore"
      persistKey="haushalt.chore"
      @close="closeSheet"
      @submit="onSheetSubmit"
    />

    <FairDistributeSheet
      :isOpen="showFair"
      :chores="chores"
      :history="history"
      :couple="couple"
      :apply="applyDistribution"
      @close="showFair = false"
      @applied="onFairApplied"
    />
  </div>
</template>

<style scoped>
.haushalt-page {
  min-height: 100%;
  padding-bottom: 96px;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
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
  padding: 13px 0;
  font-size: 13px;
}

.fair-row {
  padding: 0 var(--screen-pad);
  margin-bottom: 16px;
}

.fair-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 12px 16px;
  border: none;
  border-radius: 12px;
  background: var(--accent-tint);
  color: var(--accent);
  font-family: var(--font-body);
  font-size: 13.5px;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.12s ease;
}

.fair-btn:active {
  transform: scale(0.98);
}

.plus-tag {
  padding: 1px 7px;
  border-radius: 20px;
  background: var(--accent);
  color: var(--on-accent);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.4px;
}

.loading-msg {
  padding: 40px var(--screen-pad);
  font-size: 14px;
  color: var(--text-faint);
  text-align: center;
}

.tab-content {
  min-height: 60vh;
  touch-action: pan-y;
}

/* Sanfter Übergang beim Tab-Wechsel (auch per Swipe) */
.tab-fade-enter-active {
  transition: opacity 220ms var(--ease-standard), transform 220ms var(--ease-standard);
}

.tab-fade-leave-active {
  transition: opacity 140ms var(--ease-in), transform 140ms var(--ease-in);
}

.tab-fade-enter-from {
  opacity: 0;
  transform: translateY(6px);
}

.tab-fade-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>

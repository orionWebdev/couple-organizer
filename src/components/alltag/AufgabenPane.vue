<script setup lang="ts">
// Alltag › Aufgaben — der Hub. Oben der Punktestand (ScoreCard), darunter die
// Karte, die auf die Zuweisungs-Seite führt (Meine/Partner/Alle sehen und
// zuweisen). Der Verlauf öffnet sich aus der ScoreCard.
//
// Dieser Hub hält die EINE useChores-Instanz und reicht chores/history als Props
// an die Unterseiten (ZuweisungView, VerlaufView) — dadurch sind die Daten dort
// sofort da, statt beim Mounten einer eigenen Instanz erst leer zu rendern.
// Task-Sheet (anlegen/bearbeiten) und Fair-Verteilen-Sheet leben hier, weil sie
// als Bottom-Sheets ohnehin über allem liegen.
import { ref, computed, watch, onScopeDispose } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { useCouple } from '@/composables/useCouple'
import { useChores } from '@/composables/useChores'
import { setFabAction } from '@/composables/useFab'
import { showToast } from '@/composables/useToast'
import { showPaywall } from '@/composables/usePaywall'
import { useBackDismiss } from '@/composables/useBackButton'
import { usePersistedRef, DRAFT_TTL_MS } from '@/composables/usePersistedRef'
import { isSameDay } from '@/utils/chores'
import type { Chore, ChoreAssignee, ChoreHistoryEntry } from '@/types'
import TaskSheet from '@/components/haushalt/TaskSheet.vue'
import FairDistributeSheet from '@/components/haushalt/FairDistributeSheet.vue'
import ScoreCard from '@/components/haushalt/ScoreCard.vue'
import HaushaltAlle from '@/components/haushalt/HaushaltAlle.vue'
import ZuweisungView from '@/components/alltag/ZuweisungView.vue'
import VerlaufView from '@/components/alltag/VerlaufView.vue'

// subview meldet der AlltagView-Shell, dass eine gestapelte Unterseite offen ist
// — sie blendet dann Kopf + Segmentleiste aus (die Bottom-Nav bleibt).
const emit = defineEmits<{ subview: [active: boolean] }>()

const { user } = useAuth()
const { couple, isPremium } = useCouple()
const coupleId = computed(() => user.value?.coupleId ?? null)
const currentUserId = computed(() => user.value?.uid ?? '')

const {
  chores, history, loading,
  addChore, seedPool, updateChore, deleteChore,
  reassignChore, completeChore, undoChore,
  reassignHistoryEntry, deleteHistoryEntry,
} = useChores(coupleId)

// Wie oft heute je Aufgabe erledigt — für das Wiederhol-Badge auf recurring.
const todayCounts = computed(() => {
  const counts = new Map<string, number>()
  const now = new Date()
  for (const entry of history.value) {
    const date = (entry.completedAt as any)?.toDate?.() ?? null
    if (date && isSameDay(date, now)) counts.set(entry.choreId, (counts.get(entry.choreId) ?? 0) + 1)
  }
  return counts
})

// ── Unterseiten ──────────────────────────────────────────────
const showZuweisung = usePersistedRef('alltag.aufgaben.zuweisung', false, { ttlMs: DRAFT_TTL_MS })
const showVerlauf = usePersistedRef('alltag.aufgaben.verlauf', false, { ttlMs: DRAFT_TTL_MS })

const inSubview = computed(() => showZuweisung.value || showVerlauf.value)
watch(inSubview, (v) => emit('subview', v), { immediate: true })

// Android-Zurück schließt die jeweilige Unterseite, statt die App zu verlassen.
useBackDismiss(() => showZuweisung.value, () => { showZuweisung.value = false })
useBackDismiss(() => showVerlauf.value, () => { showVerlauf.value = false })

const router = useRouter()

// ── Task-Sheet (anlegen/bearbeiten) ──────────────────────────
const showSheet = usePersistedRef('alltag.aufgaben.showSheet', false, { ttlMs: DRAFT_TTL_MS })
const editingChoreId = usePersistedRef<string | null>('alltag.aufgaben.editId', null, { ttlMs: DRAFT_TTL_MS })
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

function openNewChore() {
  editingChore.value = null
  editingChoreId.value = null
  showSheet.value = true
}
function openEditChore(chore: Chore) {
  editingChore.value = chore
  editingChoreId.value = chore.id
  showSheet.value = true
}
function closeSheet() {
  showSheet.value = false
  editingChore.value = null
  editingChoreId.value = null
}

const FAILURE = 'Fehler beim Speichern — bitte erneut versuchen'

async function onSheetSubmit(payload: Parameters<typeof addChore>[0]) {
  const ok = editingChore.value
    ? await updateChore(editingChore.value.id, payload)
    : await addChore(payload)
  if (!ok) { showToast(FAILURE); return }
  showToast(editingChore.value ? 'Änderungen gespeichert' : 'Aufgabe angelegt')
  closeSheet()
}

async function onPick(chore: Chore, assignee: ChoreAssignee) {
  const ok = await completeChore(chore, assignee)
  showToast(ok ? 'Erledigt!' : FAILURE)
}
async function onUndo(chore: Chore) {
  if (!await undoChore(chore)) showToast(FAILURE)
}
async function onAssign(chore: Chore, assignee: ChoreAssignee) {
  const ok = await reassignChore(chore.id, assignee)
  showToast(ok ? 'Aufgabe übertragen' : FAILURE)
}
async function onDelete(chore: Chore) {
  showToast(await deleteChore(chore.id) ? 'Aufgabe gelöscht' : FAILURE)
}
async function onSeed() {
  const added = await seedPool()
  if (added < 0) showToast(FAILURE)
  else if (added === 0) showToast('Alle Standardaufgaben sind bereits im Pool')
  else showToast(`${added} Aufgabe${added === 1 ? '' : 'n'} hinzugefügt`)
}

// Verlaufs-Aktionen (im HaushaltVerlauf ausgelöst).
async function onHistoryAssign(entry: ChoreHistoryEntry, assignee: ChoreAssignee) {
  showToast(await reassignHistoryEntry(entry.id, assignee) ? 'Eintrag übertragen' : FAILURE)
}
async function onHistoryDelete(entry: ChoreHistoryEntry) {
  showToast(await deleteHistoryEntry(entry.id) ? 'Eintrag gelöscht' : FAILURE)
}

// ── Fair verteilen (Plus) ────────────────────────────────────
const showFair = ref(false)
function openFair() {
  if (!isPremium.value) { showPaywall('choreBalance'); return }
  showFair.value = true
}
async function applyDistribution(changes: { choreId: string; to: string }[]): Promise<number> {
  let n = 0
  for (const c of changes) if (await reassignChore(c.choreId, c.to)) n++
  return n
}
function onFairApplied(count: number) {
  showFair.value = false
  showToast(count > 0 ? `${count} Aufgabe${count === 1 ? '' : 'n'} neu verteilt` : 'Nichts geändert')
}

// Einstieg aus dem Coach (/alltag?tab=aufgaben&coach=fair): direkt auf die
// Zuweisungs-Seite und das Fair-Sheet öffnen. Query danach entfernen, tab
// erhalten.
const route = useRoute()
watch(
  () => route.query.coach,
  (value) => {
    if (value !== 'fair') return
    showZuweisung.value = true
    openFair()
    const { coach, ...rest } = route.query
    router.replace({ path: route.path, query: rest })
  },
  { immediate: true }
)

// ── FAB je Ansicht ───────────────────────────────────────────
// Hub + Zuweisung: Aufgabe hinzufügen. Verlauf: nichts.
watch(
  () => showVerlauf.value,
  (inVerlauf) => {
    setFabAction(inVerlauf ? null : { label: 'Aufgabe hinzufügen', handler: openNewChore })
  },
  { immediate: true }
)
onScopeDispose(() => setFabAction(null))
</script>

<template>
  <!-- Verlauf (Unterseite) -->
  <VerlaufView
    v-if="showVerlauf"
    :history="history"
    :couple="couple"
    @back="showVerlauf = false"
    @assign="onHistoryAssign"
    @delete="onHistoryDelete"
  />

  <!-- Zuweisungen (Unterseite) -->
  <ZuweisungView
    v-else-if="showZuweisung"
    :chores="chores"
    :history="history"
    :couple="couple"
    :currentUserId="currentUserId"
    :todayCounts="todayCounts"
    :isPremium="isPremium"
    @back="showZuweisung = false"
    @pick="onPick"
    @undo="onUndo"
    @assign="onAssign"
    @edit="openEditChore"
    @delete="onDelete"
    @seed="onSeed"
    @openFair="openFair"
  />

  <!-- Hub: Punktestand + Zuweisung-Karte -->
  <div v-else class="aufgaben-hub rise-stagger">
    <ScoreCard
      :history="history"
      :couple="couple"
      @balance="router.push('/planung')"
      @verlauf="showVerlauf = true"
    />

    <button type="button" class="hub-card" @click="showZuweisung = true">
      <span class="hub-card__ico" aria-hidden="true">🧹</span>
      <span class="hub-card__text">
        Zuweisungen
        <span>Meine · Partner · alle — sehen und verteilen</span>
      </span>
      <span class="hub-card__go" aria-hidden="true">›</span>
    </button>

    <!-- Alle Aufgaben mit Raumfilter (wie früher der „Alle"-Tab). -->
    <div class="all-tasks">
      <HaushaltAlle
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
    </div>
  </div>

  <TaskSheet
    :isOpen="showSheet"
    :couple="couple"
    :editingChore="editingChore"
    persistKey="alltag.aufgaben.chore"
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
</template>

<style scoped>
.aufgaben-hub {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding-top: 4px;
}

.hub-card {
  display: flex;
  align-items: center;
  gap: 12px;
  width: calc(100% - 2 * var(--screen-pad));
  margin: 0 var(--screen-pad) 12px;
  padding: 16px;
  border: none;
  border-radius: var(--radius-card);
  background: var(--surface);
  box-shadow: var(--shadow-card);
  cursor: pointer;
  text-align: left;
}
.hub-card__ico {
  flex: none;
  width: 40px;
  height: 40px;
  border-radius: var(--radius-tile);
  display: grid;
  place-items: center;
  font-size: 19px;
  background: var(--accent-tint);
}
.hub-card__text {
  flex: 1;
  font-family: var(--font-headline);
  font-size: 16px;
  font-weight: 600;
  color: var(--text);
}
.hub-card__text span {
  display: block;
  font-family: var(--font-body);
  font-size: 12px;
  font-weight: 700;
  color: var(--text-meta);
  margin-top: 3px;
}
.hub-card__go {
  font-size: 22px;
  color: var(--text-faint);
}

/* „Alle Aufgaben" (HaushaltAlle) bringt eigenen horizontalen Rand mit
   (padding: 0 screen-pad) — hier nur etwas Abstand nach oben. */
.all-tasks {
  margin-top: 6px;
}
</style>

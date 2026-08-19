<script setup lang="ts">
import { ref, computed, watch, onScopeDispose } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { useCouple } from '@/composables/useCouple'
import { useBucketList } from '@/composables/useBucketList'
import { usePlanung } from '@/composables/usePlanung'
import { useCoachRun } from '@/composables/useCoachRun'
import { useCheckin } from '@/composables/useCheckin'
import { usePersistedRef, DRAFT_TTL_MS } from '@/composables/usePersistedRef'
import { setFabAction } from '@/composables/useFab'
import { showToast } from '@/composables/useToast'
import type { BucketListItem, IdeaCategory, Trip, TripChecklistItem } from '@/types'
import type { CoachAction, CoachLens } from '@/services/ai'
import IdeenBlock from '@/components/planung/IdeenBlock.vue'
import ReisenBlock from '@/components/planung/ReisenBlock.vue'
import AddIdeaSheet from '@/components/planung/AddIdeaSheet.vue'
import TripSheet from '@/components/planung/TripSheet.vue'
import TripDetailSheet from '@/components/planung/TripDetailSheet.vue'
import CoachCard from '@/components/dashboard/CoachCard.vue'
import CheckinCard from '@/components/dashboard/CheckinCard.vue'
import CheckinSheet from '@/components/dashboard/CheckinSheet.vue'
import TogetherHeroCard from '@/components/dashboard/TogetherHeroCard.vue'
import MentalLoadCard from '@/components/dashboard/MentalLoadCard.vue'
import { rangeLabel } from '@/utils/dateLabels'

// „Wir" (Route unverändert /planung): der Beziehungs-Bereich in EINER Spalte.
// Seit dem 2er-Umbau KEIN Tab mehr, sondern eine Unterseite der Einstellungen —
// erreichbar über die „Wir"-Zeile dort und über „Balance in Wir ›" in der
// ScoreCard. Inhalt und Route sind unverändert, nur der Nav-Slot ist weg.
const router = useRouter()
const { user } = useAuth()
const { couple, setCheckinConsent } = useCouple()
const coupleId = computed(() => user.value?.coupleId ?? null)
const currentUserId = computed(() => user.value?.uid ?? '')

const { items: ideen, loading: ideenLoading, addItem, updateItem, toggleDone, deleteItem } = useBucketList(coupleId)
const { trips, loading: planungLoading, addTrip, updateTrip, deleteTrip } = usePlanung(coupleId)

// Gemeinsamer Ladezustand der Listen — der Restore-Guard wartet darauf, bevor er
// ein bearbeitetes Objekt aus seiner ID zurückholt (sonst schlösse er das Sheet,
// weil die Liste beim ersten Lauf noch leer ist).
const listsLoading = computed(() => ideenLoading.value || planungLoading.value)

// ── Coach (drei Linsen: Woche · Fairness · Geld) ──────────────
// Anzeige UND Erzeugung: leere Linsen (Fairness/Geld — und Woche) werden in der
// CoachCard selbst erzeugt (startCoach), da wo man sie ansieht. Der globale
// KI-Button ist nur noch die Abkürzung für den Wochen-Rückblick.
// mentalLoad kommt aus denselben Listenern — die Wertschätzungs-Karte darunter
// benennt, was der Partner mitgedacht hat (keine Waage mehr).
const {
  mentalLoad, togetherStats,
  coachReportFor, coachMetricsFor, coachCreatedByNameFor, coachLoading,
  startCoach, coachThinking,
} = useCoachRun(coupleId)

// Eine warme, datengetragene Zeile fürs Herzstück: das nächste geplante
// Gemeinsame nach vorn (motivierend), sonst eine Wertschätzung des Erreichten.
const weeklyHighlight = computed(() => {
  const todayKey = new Date().toISOString().slice(0, 10)

  // Nächste datierte Idee (offen) ODER Reise mit Startdatum in der Zukunft.
  const nextIdea = ideen.value
    .filter((i) => i.date && !i.done && i.date >= todayKey)
    .sort((a, b) => (a.date! < b.date! ? -1 : 1))[0]
  const nextTrip = trips.value
    .filter((t) => t.startDate && t.startDate >= todayKey)
    .sort((a, b) => (a.startDate! < b.startDate! ? -1 : 1))[0]

  const ideaTs = nextIdea?.date ?? null
  const tripTs = nextTrip?.startDate ?? null
  if (ideaTs && (!tripTs || ideaTs <= tripTs)) return `Als Nächstes zu zweit: ${nextIdea!.name}.`
  if (nextTrip) {
    const when = nextTrip.startDate
      ? rangeLabel(nextTrip.startDate, nextTrip.endDate ?? null)
      : nextTrip.when
    return `Bald unterwegs: ${nextTrip.title}${when ? ` · ${when}` : ''}.`
  }

  const ideasDone = ideen.value.filter((i) => i.done).length
  if (ideasDone > 0) return `Ihr habt schon ${ideasDone} ${ideasDone === 1 ? 'Idee' : 'Ideen'} zusammen umgesetzt.`
  return 'Schön, dass ihr euren Alltag gemeinsam angeht.'
})

const {
  entries: checkinEntries,
  optedIn: checkinOptedIn,
  addEntry: addCheckinEntry,
  removeEntry: removeCheckinEntry,
} = useCheckin(coupleId)

const showCheckinSheet = usePersistedRef('planung.showCheckin', false, { ttlMs: DRAFT_TTL_MS })

async function onCheckinConsent() {
  if (!await setCheckinConsent(true)) showToast('Konnte nicht gespeichert werden')
}
async function onCheckinSubmit(payload: Parameters<typeof addCheckinEntry>[0]) {
  if (!await addCheckinEntry(payload)) { showToast('Konnte nicht gespeichert werden'); return }
  showCheckinSheet.value = false
  showToast('Gespeichert — nur für dich 🔒')
}
async function onCheckinRemove(id: string) {
  if (!await removeCheckinEntry(id)) showToast('Konnte nicht gelöscht werden')
}

// Der Coach schlägt vor, die App führt aus: planIdea öffnet hier direkt das
// Ideen-Sheet, die anderen Aktionen reisen per Query in ihren Zielbereich
// (die Zielview räumt die Query danach weg).
function onCoachAction(action: CoachAction) {
  if (action === 'rebalanceChores') router.push('/alltag?tab=aufgaben&coach=fair')
  else if (action === 'settleUp') router.push('/alltag?tab=geld&coach=settle')
  else if (action === 'planIdea') openIdeaSheet()
  else if (action === 'setBudget') router.push('/dashboard?coach=budget')
}

// ── Sheets (Idee / Reise) ─────────────────────────────────────
type Sheet = 'idea' | 'trip' | null
const sheet = usePersistedRef<Sheet>('planung.sheet', null, { ttlMs: DRAFT_TTL_MS })
const editingIdeaId = usePersistedRef<string | null>('planung.editIdeaId', null, { ttlMs: DRAFT_TTL_MS })
const editingTripId = usePersistedRef<string | null>('planung.editTripId', null, { ttlMs: DRAFT_TTL_MS })
const editingIdea = ref<BucketListItem | null>(null)
const editingTrip = ref<Trip | null>(null)

const detailTripId = usePersistedRef<string | null>('planung.detailTripId', null, { ttlMs: DRAFT_TTL_MS })
const detailTrip = computed(() => trips.value.find((t) => t.id === detailTripId.value) ?? null)

// Nach dem Kaltstart die bearbeiteten Objekte aus den IDs wiederherstellen —
// erst, wenn die Listen geladen sind. Der `busy`-Guard ist zugleich der Schutz
// vor der TDZ: im immediate-Lauf ist `busy` true, der Callback kehrt zurück,
// bevor er `stopSheetRestore` (unten noch nicht initialisiert) berührt.
const stopSheetRestore = watch(
  () => listsLoading.value,
  (busy) => {
    if (busy) return
    if (editingIdeaId.value) {
      editingIdea.value = ideen.value.find((i) => i.id === editingIdeaId.value) ?? null
      if (sheet.value === 'idea' && !editingIdea.value) { sheet.value = null; editingIdeaId.value = null }
    }
    if (editingTripId.value) {
      editingTrip.value = trips.value.find((t) => t.id === editingTripId.value) ?? null
      if (sheet.value === 'trip' && !editingTrip.value) { sheet.value = null; editingTripId.value = null }
    }
    stopSheetRestore()
  },
  { immediate: true }
)

function openIdeaSheet() {
  editingIdea.value = null; editingIdeaId.value = null; sheet.value = 'idea'
}
function openEditIdea(item: BucketListItem) {
  editingIdea.value = item; editingIdeaId.value = item.id; sheet.value = 'idea'
}
function openTripSheet() {
  editingTrip.value = null; editingTripId.value = null; sheet.value = 'trip'
}
function openTripDetail(trip: Trip) { detailTripId.value = trip.id }
function editTripFromDetail(trip: Trip) {
  detailTripId.value = null; editingTrip.value = trip; editingTripId.value = trip.id; sheet.value = 'trip'
}
function closeSheet() {
  sheet.value = null
  editingIdea.value = null; editingTrip.value = null
  editingIdeaId.value = null; editingTripId.value = null
}

// Globaler FAB (App-Shell): neue Idee (Reise läuft über das „+" im Block-Kopf).
setFabAction({ label: 'Idee hinzufügen', handler: openIdeaSheet })
onScopeDispose(() => setFabAction(null))

async function onSubmitIdea(payload: { category: IdeaCategory; name: string; suggestedBy: string; date: string | null }) {
  const wasEditing = !!editingIdea.value
  const ok = wasEditing ? await updateItem(editingIdea.value!.id, payload) : await addItem(payload)
  closeSheet()
  showToast(ok ? (wasEditing ? 'Idee aktualisiert' : 'Idee gemerkt 💡') : 'Fehler beim Speichern')
}
async function onToggleIdea(item: BucketListItem) { await toggleDone(item) }
async function onDeleteIdea(item: BucketListItem) {
  showToast(await deleteItem(item.id) ? 'Idee gelöscht' : 'Fehler beim Löschen')
}

async function onSubmitTrip(payload: {
  title: string; emoji: string; location: string
  startDate: string | null; endDate: string | null; when: string; notes: string
}) {
  const wasEditing = !!editingTrip.value
  const ok = wasEditing ? await updateTrip(editingTrip.value!.id, payload) : await addTrip(payload)
  closeSheet()
  showToast(ok ? (wasEditing ? 'Reise aktualisiert' : 'Reise gemerkt 🧳') : 'Fehler beim Speichern')
}
async function onDeleteTrip(trip: Trip) {
  detailTripId.value = null
  showToast(await deleteTrip(trip.id) ? 'Reise gelöscht' : 'Fehler beim Löschen')
}
async function onPatchTrip(id: string, patch: { links?: string[]; checklist?: TripChecklistItem[] }) {
  await updateTrip(id, patch)
}
</script>

<template>
  <div class="planung-page area-planung">
    <div class="page-header">
      <button class="back-caret" type="button" @click="router.push('/settings')" aria-label="Zurück">‹</button>
      <h1 class="page-title">Wir</h1>
    </div>

    <div class="wir-body rise-stagger">
      <!-- Herzstück: das Erreichte, warm — Wertschätzung vor Bilanz. -->
      <TogetherHeroCard :stats="togetherStats" :highlight="weeklyHighlight" />

      <!-- Die Deutungsfläche: alle drei Linsen, leere erzeugt man hier inline. -->
      <CoachCard
        :reportFor="(l: CoachLens) => coachReportFor(l)"
        :metricsFor="(l: CoachLens) => coachMetricsFor(l)"
        :createdByNameFor="(l: CoachLens) => coachCreatedByNameFor(l)"
        :generate="startCoach"
        :thinking="coachThinking"
        :loading="coachLoading"
        @action="onCoachAction"
      />

      <!-- Mental Load, neu: was der Partner mitgedacht hat + „Danke sagen"
           (keine Prozent-Waage mehr — Wertschätzung statt Bilanz). -->
      <MentalLoadCard
        :summary="mentalLoad"
        :couple="couple"
        :currentUserId="currentUserId"
      />

      <!-- Check-in kompakt: eine Ein-Tap-Zeile (private Einträge verwaltet man
           in den Einstellungen). -->
      <CheckinCard
        compact
        :entries="checkinEntries"
        :optedIn="checkinOptedIn"
        @open="showCheckinSheet = true"
        @remove="onCheckinRemove"
      />

      <!-- Was ihr vorhabt -->
      <IdeenBlock
        :items="ideen"
        :couple="couple"
        :currentUserId="currentUserId"
        @add="openIdeaSheet"
        @edit="openEditIdea"
        @toggle="onToggleIdea"
        @delete="onDeleteIdea"
      />

      <ReisenBlock
        :trips="trips"
        @add="openTripSheet"
        @open="openTripDetail"
        @delete="onDeleteTrip"
      />
    </div>

    <AddIdeaSheet
      :isOpen="sheet === 'idea'"
      :couple="couple"
      :currentUserId="user?.uid ?? ''"
      :editing="editingIdea"
      persistKey="planung.idea"
      @close="closeSheet"
      @submit="onSubmitIdea"
    />

    <TripSheet
      :isOpen="sheet === 'trip'"
      :editing="editingTrip"
      persistKey="planung.trip"
      @close="closeSheet"
      @submit="onSubmitTrip"
    />

    <TripDetailSheet
      :trip="detailTrip"
      @close="detailTripId = null"
      @edit="editTripFromDetail"
      @delete="onDeleteTrip"
      @patch="onPatchTrip"
    />

    <CheckinSheet
      :isOpen="showCheckinSheet"
      :optedIn="checkinOptedIn"
      areaClass="area-planung"
      @close="showCheckinSheet = false"
      @consent="onCheckinConsent"
      @submit="onCheckinSubmit"
    />
  </div>
</template>

<style scoped>
.planung-page {
  min-height: 100%;
}

.page-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: calc(var(--safe-top) + 20px) var(--screen-pad) 12px;
}

/* Zurück zu den Einstellungen — dieselbe Form wie auf den anderen
   Settings-Unterseiten (FoodProfileView, QuickTasksSettingsView). */
.back-caret {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  background: transparent;
  border: none;
  font-size: 24px;
  font-weight: 700;
  color: var(--text-faint);
  cursor: pointer;
}

.back-caret:active {
  color: var(--text);
}

.page-title {
  font-family: var(--font-headline);
  font-size: 28px;
  font-weight: 700;
  color: var(--text);
  margin: 0;
}

.wir-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 0 var(--screen-pad) 24px;
}
</style>

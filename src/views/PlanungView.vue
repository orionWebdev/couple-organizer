<script setup lang="ts">
import { ref, computed, watch, onScopeDispose } from 'vue'
import { useRoute } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { useCouple } from '@/composables/useCouple'
import { useBucketList } from '@/composables/useBucketList'
import { usePlanung } from '@/composables/usePlanung'
import { useTabSwipe } from '@/composables/useTabSwipe'
import { usePersistedRef, DRAFT_TTL_MS } from '@/composables/usePersistedRef'
import { setFabAction } from '@/composables/useFab'
import { showToast } from '@/composables/useToast'
import type { BucketListItem, IdeaCategory, Note, Trip } from '@/types'
import ProfileButton from '@/components/ui/ProfileButton.vue'
import SegmentToggle from '@/components/ui/SegmentToggle.vue'
import BelegungKalender from '@/components/planung/BelegungKalender.vue'
import SectionCard from '@/components/planung/SectionCard.vue'
import IdeenBlock from '@/components/planung/IdeenBlock.vue'
import ReisenBlock from '@/components/planung/ReisenBlock.vue'
import NotizenBlock from '@/components/planung/NotizenBlock.vue'
import AddIdeaSheet from '@/components/planung/AddIdeaSheet.vue'
import TripSheet from '@/components/planung/TripSheet.vue'
import TripDetailSheet from '@/components/planung/TripDetailSheet.vue'
import QuickAddSheet from '@/components/planung/QuickAddSheet.vue'
import type { TripChecklistItem } from '@/types'

const route = useRoute()
const { user } = useAuth()
const { couple } = useCouple()
const coupleId = computed(() => user.value?.coupleId ?? null)

const { items: ideen, loading: ideenLoading, addItem, updateItem, toggleDone, deleteItem } = useBucketList(coupleId)
const {
  trips, notes, loading: planungLoading,
  addTrip, updateTrip, deleteTrip, addNote, deleteNote,
} = usePlanung(coupleId)

const listsLoading = computed(() => ideenLoading.value || planungLoading.value)

// ── Tabs: Kalender · Listen ───────────────────────────────────
type Tab = 'kalender' | 'listen'
const tabOptions = [
  { label: 'Kalender', value: 'kalender' },
  { label: 'Listen', value: 'listen' },
]
// Persistiert (überlebt den Android-Kaltstart); ein expliziter ?tab=-Deeplink
// gewinnt aber weiterhin über den gemerkten Stand.
const tab = usePersistedRef<Tab>('planung.tab', 'kalender')
if (route.query.tab === 'listen') tab.value = 'listen'
else if (route.query.tab === 'kalender') tab.value = 'kalender'

const tabOrder: Tab[] = ['kalender', 'listen']
const { onTouchStart, onTouchMove, onTouchEnd } = useTabSwipe(tabOrder, tab)

const kalenderRef = ref<InstanceType<typeof BelegungKalender> | null>(null)

// ── Sheets ────────────────────────────────────────────────────
// Offener Sheet + Detail überleben den Kaltstart (TTL). Das jeweils bearbeitete
// Objekt kann nicht als Ganzes persistiert werden — wir merken uns seine ID und
// leiten das Objekt beim Laden wieder ab, damit "Absenden" korrekt aktualisiert
// statt ein Duplikat anzulegen.
type Sheet = 'idea' | 'trip' | 'note' | null
const sheet = usePersistedRef<Sheet>('planung.sheet', null, { ttlMs: DRAFT_TTL_MS })
const editingIdeaId = usePersistedRef<string | null>('planung.editIdeaId', null, { ttlMs: DRAFT_TTL_MS })
const editingTripId = usePersistedRef<string | null>('planung.editTripId', null, { ttlMs: DRAFT_TTL_MS })
const editingIdea = ref<BucketListItem | null>(null)
const editingTrip = ref<Trip | null>(null)

// Reise-Detail: die ID halten und die Reise live aus der Liste ableiten, damit
// Änderungen (Packliste/Links) sofort durchschlagen.
const detailTripId = usePersistedRef<string | null>('planung.detailTripId', null, { ttlMs: DRAFT_TTL_MS })
const detailTrip = computed(() => trips.value.find((t) => t.id === detailTripId.value) ?? null)

// Nach dem Kaltstart die bearbeiteten Objekte aus den IDs wiederherstellen,
// sobald die Listen geladen sind. Gibt es das Objekt nicht mehr (gelöscht),
// wird der Edit-Sheet geschlossen statt versehentlich neu anzulegen.
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
  editingIdea.value = null
  editingIdeaId.value = null
  sheet.value = 'idea'
}
function openEditIdea(item: BucketListItem) {
  editingIdea.value = item
  editingIdeaId.value = item.id
  sheet.value = 'idea'
}
function openTripSheet() {
  editingTrip.value = null
  editingTripId.value = null
  sheet.value = 'trip'
}
function openTripDetail(trip: Trip) {
  detailTripId.value = trip.id
}
function editTripFromDetail(trip: Trip) {
  detailTripId.value = null
  editingTrip.value = trip
  editingTripId.value = trip.id
  sheet.value = 'trip'
}
function closeSheet() {
  sheet.value = null
  editingIdea.value = null
  editingTrip.value = null
  editingIdeaId.value = null
  editingTripId.value = null
}

// Globaler FAB (App-Shell): Kalender → Belegung anlegen, Listen → neue Idee
// (Reise/Notiz laufen weiter über das "+" im jeweiligen Block-Kopf).
watch(tab, (t) => {
  setFabAction(
    t === 'kalender'
      ? { label: 'Belegung anlegen', handler: () => kalenderRef.value?.openNew() }
      : { label: 'Idee hinzufügen', handler: openIdeaSheet }
  )
}, { immediate: true })
onScopeDispose(() => setFabAction(null))

async function onSubmitIdea(payload: { category: IdeaCategory; name: string; suggestedBy: string; date: string | null }) {
  const wasEditing = !!editingIdea.value
  const ok = wasEditing
    ? await updateItem(editingIdea.value!.id, payload)
    : await addItem(payload)
  closeSheet()
  showToast(ok ? (wasEditing ? 'Idee aktualisiert' : 'Idee gemerkt 💡') : 'Fehler beim Speichern')
}

async function onToggleIdea(item: BucketListItem) {
  await toggleDone(item)
}

async function onDeleteIdea(item: BucketListItem) {
  const ok = await deleteItem(item.id)
  showToast(ok ? 'Idee gelöscht' : 'Fehler beim Löschen')
}

async function onSubmitTrip(payload: {
  title: string; emoji: string; location: string
  startDate: string | null; endDate: string | null; when: string; notes: string
}) {
  const wasEditing = !!editingTrip.value
  const ok = wasEditing
    ? await updateTrip(editingTrip.value!.id, payload)
    : await addTrip(payload)
  closeSheet()
  showToast(ok ? (wasEditing ? 'Reise aktualisiert' : 'Reise gemerkt 🧳') : 'Fehler beim Speichern')
}

async function onDeleteTrip(trip: Trip) {
  detailTripId.value = null
  const ok = await deleteTrip(trip.id)
  showToast(ok ? 'Reise gelöscht' : 'Fehler beim Löschen')
}

// Packliste/Links am offenen Reise-Detail — still speichern (kein Toast).
async function onPatchTrip(id: string, patch: { links?: string[]; checklist?: TripChecklistItem[] }) {
  await updateTrip(id, patch)
}

async function onAddNote(payload: { text: string }) {
  const ok = await addNote(payload.text)
  closeSheet()
  showToast(ok ? 'Notiz gespeichert 📝' : 'Fehler beim Speichern')
}

async function onDeleteNote(note: Note) {
  const ok = await deleteNote(note.id)
  showToast(ok ? 'Notiz gelöscht' : 'Fehler beim Löschen')
}

// Leerzustand: noch gar keine Liste — dann nur eine Einladung statt drei
// leerer Karten.
const listsEmpty = computed(() =>
  !ideen.value.length && !trips.value.length && !notes.value.length
)
</script>

<template>
  <div class="planung-page area-planung">
    <div class="page-header">
      <h1 class="page-title">Planung</h1>
      <ProfileButton :size="34" />
    </div>

    <div class="tab-bar-wrap">
      <SegmentToggle v-model="tab" :options="tabOptions" class="tab-bar" />
    </div>

    <div
      class="tab-area"
      @touchstart.passive="onTouchStart"
      @touchmove.passive="onTouchMove"
      @touchend.passive="onTouchEnd"
      @touchcancel.passive="onTouchEnd"
    >
      <div class="tab-content">
        <Transition name="tab-fade" mode="out-in">
          <!-- Kalender -->
          <div v-if="tab === 'kalender'" key="kalender" class="tab-scroll rise-stagger">
            <BelegungKalender
              ref="kalenderRef"
              :ideas="ideen"
              :trips="trips"
              @editIdea="openEditIdea"
              @openTrip="openTripDetail"
            />
          </div>

          <!-- Listen: Ideen · Reisen · Notizen -->
          <div v-else key="listen" class="tab-scroll">
            <div v-if="listsLoading" class="loading-msg">Laden…</div>

            <div v-else class="listen-body rise-stagger">
              <SectionCard v-if="listsEmpty" title="Was habt ihr vor?">
                <p class="empty-text">Ideen, Reisen und Notizen sammeln sich hier.</p>
                <button class="empty-btn" type="button" @click="openIdeaSheet">＋ Erste Idee</button>
              </SectionCard>

              <template v-else>
                <IdeenBlock
                  :items="ideen"
                  :couple="couple"
                  :currentUserId="user?.uid ?? ''"
                  @add="openIdeaSheet"
                  @edit="openEditIdea"
                  @toggle="onToggleIdea"
                  @delete="onDeleteIdea"
                />
                <ReisenBlock :trips="trips" @add="openTripSheet" @open="openTripDetail" @delete="onDeleteTrip" />
                <NotizenBlock :notes="notes" @add="sheet = 'note'" @delete="onDeleteNote" />
              </template>
            </div>
          </div>
        </Transition>
      </div>
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

    <QuickAddSheet
      :isOpen="sheet === 'note'"
      title="Neue Notiz"
      placeholder="Kurz festhalten …"
      submitLabel="Notiz speichern"
      persistKey="planung.note"
      @close="closeSheet"
      @submit="onAddNote"
    />
  </div>
</template>

<style scoped>
.planung-page {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: calc(var(--safe-top) + 20px) var(--screen-pad) 20px;
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

.tab-area {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  touch-action: pan-y;
}

.tab-content {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

/* Sanfter Übergang beim Tab-Wechsel (gleiches Muster wie EinkaufenView) */
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

.tab-scroll {
  flex: 1;
  overflow-y: auto;
  /* Nur vertikal scrollen — horizontale Gesten gehören dem Tab-Swipe. */
  touch-action: pan-y;
}

.loading-msg {
  padding: 40px var(--screen-pad);
  font-size: 18px;
  color: var(--text-faint);
  text-align: center;
}

.listen-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 0 var(--screen-pad) 24px;
}

.empty-text {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.45;
  color: var(--text-secondary);
}

.empty-btn {
  margin-top: 14px;
  padding: 11px 20px;
  border: none;
  border-radius: 12px;
  background: var(--accent);
  color: #fff;
  font-family: var(--font-body);
  font-size: 13.5px;
  font-weight: 800;
  cursor: pointer;
}
</style>

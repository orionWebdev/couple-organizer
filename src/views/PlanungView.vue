<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { useCouple } from '@/composables/useCouple'
import { useBucketList } from '@/composables/useBucketList'
import { usePlanung } from '@/composables/usePlanung'
import { useTabSwipe } from '@/composables/useTabSwipe'
import { showToast } from '@/composables/useToast'
import type { BucketListItem, IdeaCategory, Note, Trip } from '@/types'
import ProfileButton from '@/components/ui/ProfileButton.vue'
import SegmentToggle from '@/components/ui/SegmentToggle.vue'
import FabButton from '@/components/ui/FabButton.vue'
import BelegungKalender from '@/components/planung/BelegungKalender.vue'
import SectionCard from '@/components/planung/SectionCard.vue'
import IdeenBlock from '@/components/planung/IdeenBlock.vue'
import ReisenBlock from '@/components/planung/ReisenBlock.vue'
import NotizenBlock from '@/components/planung/NotizenBlock.vue'
import AddIdeaSheet from '@/components/planung/AddIdeaSheet.vue'
import QuickAddSheet from '@/components/planung/QuickAddSheet.vue'

const route = useRoute()
const { user } = useAuth()
const { couple } = useCouple()
const coupleId = computed(() => user.value?.coupleId ?? null)

const { items: ideen, loading: ideenLoading, addItem, toggleDone, deleteItem } = useBucketList(coupleId)
const {
  trips, notes, loading: planungLoading,
  addTrip, deleteTrip, addNote, deleteNote,
} = usePlanung(coupleId)

const listsLoading = computed(() => ideenLoading.value || planungLoading.value)

// ── Tabs: Kalender · Listen ───────────────────────────────────
type Tab = 'kalender' | 'listen'
const tabOptions = [
  { label: 'Kalender', value: 'kalender' },
  { label: 'Listen', value: 'listen' },
]
const tab = ref<Tab>(route.query.tab === 'listen' ? 'listen' : 'kalender')

const tabOrder: Tab[] = ['kalender', 'listen']
const { onTouchStart, onTouchMove, onTouchEnd } = useTabSwipe(tabOrder, tab)

const kalenderRef = ref<InstanceType<typeof BelegungKalender> | null>(null)

// ── Sheets ────────────────────────────────────────────────────
type Sheet = 'idea' | 'trip' | 'note' | null
const sheet = ref<Sheet>(null)

async function onAddIdea(payload: { category: IdeaCategory; name: string; suggestedBy: string }) {
  const ok = await addItem(payload)
  sheet.value = null
  showToast(ok ? 'Idee gemerkt 💡' : 'Fehler beim Speichern')
}

async function onToggleIdea(item: BucketListItem) {
  await toggleDone(item)
}

async function onDeleteIdea(item: BucketListItem) {
  const ok = await deleteItem(item.id)
  showToast(ok ? 'Idee gelöscht' : 'Fehler beim Löschen')
}

async function onAddTrip(payload: { text: string; extra: string }) {
  const ok = await addTrip({ title: payload.text, when: payload.extra, emoji: '🧳' })
  sheet.value = null
  showToast(ok ? 'Reise gemerkt 🧳' : 'Fehler beim Speichern')
}

async function onDeleteTrip(trip: Trip) {
  const ok = await deleteTrip(trip.id)
  showToast(ok ? 'Reise gelöscht' : 'Fehler beim Löschen')
}

async function onAddNote(payload: { text: string }) {
  const ok = await addNote(payload.text)
  sheet.value = null
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
          <div v-if="tab === 'kalender'" key="kalender" class="tab-scroll">
            <BelegungKalender ref="kalenderRef" />
          </div>

          <!-- Listen: Ideen · Reisen · Notizen -->
          <div v-else key="listen" class="tab-scroll">
            <div v-if="listsLoading" class="loading-msg">Laden…</div>

            <div v-else class="listen-body">
              <SectionCard v-if="listsEmpty" title="Was habt ihr vor?">
                <p class="empty-text">Ideen, Reisen und Notizen sammeln sich hier.</p>
                <button class="empty-btn" type="button" @click="sheet = 'idea'">＋ Erste Idee</button>
              </SectionCard>

              <template v-else>
                <IdeenBlock
                  :items="ideen"
                  :couple="couple"
                  @add="sheet = 'idea'"
                  @toggle="onToggleIdea"
                  @delete="onDeleteIdea"
                />
                <ReisenBlock :trips="trips" @add="sheet = 'trip'" @delete="onDeleteTrip" />
                <NotizenBlock :notes="notes" @add="sheet = 'note'" @delete="onDeleteNote" />
              </template>
            </div>
          </div>
        </Transition>
      </div>

      <!-- Außerhalb der Transition (verhindert das FAB-Slow-Slide-Problem,
           siehe EinkaufenView), aber innerhalb der Swipe-Zone. -->
      <FabButton
        v-if="tab === 'kalender'"
        label="Belegung anlegen"
        @click="kalenderRef?.openNew()"
      />
    </div>

    <AddIdeaSheet
      :isOpen="sheet === 'idea'"
      :couple="couple"
      :currentUserId="user?.uid ?? ''"
      @close="sheet = null"
      @submit="onAddIdea"
    />

    <QuickAddSheet
      :isOpen="sheet === 'trip'"
      title="Neue Reise / Ausflug"
      placeholder="z. B. Städtetrip Kopenhagen"
      extraLabel="Wann?"
      extraPlaceholder="z. B. Sept. — leer = noch offen"
      submitLabel="Reise merken"
      @close="sheet = null"
      @submit="onAddTrip"
    />

    <QuickAddSheet
      :isOpen="sheet === 'note'"
      title="Neue Notiz"
      placeholder="Kurz festhalten …"
      submitLabel="Notiz speichern"
      @close="sheet = null"
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

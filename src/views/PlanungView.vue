<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { useCouple } from '@/composables/useCouple'
import { useBelegung } from '@/composables/useBelegung'
import { useBucketList } from '@/composables/useBucketList'
import { usePlanung } from '@/composables/usePlanung'
import { showToast } from '@/composables/useToast'
import type { BucketListItem, IdeaCategory, Note, Trip } from '@/types'
import ProfileButton from '@/components/ui/ProfileButton.vue'
import SectionCard from '@/components/planung/SectionCard.vue'
import BelegungBlock from '@/components/planung/BelegungBlock.vue'
import IdeenBlock from '@/components/planung/IdeenBlock.vue'
import ReisenBlock from '@/components/planung/ReisenBlock.vue'
import NotizenBlock from '@/components/planung/NotizenBlock.vue'
import AddIdeaSheet from '@/components/planung/AddIdeaSheet.vue'
import QuickAddSheet from '@/components/planung/QuickAddSheet.vue'

const router = useRouter()
const { user } = useAuth()
const { couple } = useCouple()
const coupleId = computed(() => user.value?.coupleId ?? null)

const { bookings, resourceById, loading: belegungLoading } = useBelegung(coupleId)
const { items: ideen, loading: ideenLoading, addItem, toggleDone, deleteItem } = useBucketList(coupleId)
const {
  trips, notes, loading: planungLoading,
  addTrip, deleteTrip, addNote, deleteNote,
} = usePlanung(coupleId)

const loading = computed(() => belegungLoading.value || ideenLoading.value || planungLoading.value)

function openKalender() {
  router.push('/belegung')
}

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

// Leerzustand: noch gar nichts geplant — dann nur eine Einladung statt drei
// leerer Karten.
const isEmpty = computed(() =>
  !ideen.value.length && !trips.value.length && !notes.value.length && !bookings.value.length
)
</script>

<template>
  <div class="planung-page area-planung">
    <div class="page-header">
      <div>
        <h1 class="page-title">Planung</h1>
        <p class="page-subtitle">Belegung · Ideen · Reisen</p>
      </div>
      <ProfileButton :size="34" />
    </div>

    <div v-if="loading" class="loading-msg">Laden…</div>

    <div v-else class="planung-body">
      <BelegungBlock
        :bookings="bookings"
        :resourceById="resourceById"
        :couple="couple"
        @open="openKalender"
      />

      <SectionCard v-if="isEmpty" icon="🗺️" title="Was habt ihr vor?">
        <p class="empty-text">Belegungen, Ideen, Reisen und Notizen sammeln sich hier.</p>
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
  min-height: 100%;
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  padding: calc(var(--safe-top) + 20px) var(--screen-pad) 8px;
}

.page-title {
  font-family: var(--font-headline);
  font-size: 24px;
  font-weight: 700;
  color: var(--text);
  margin: 0;
}

.page-subtitle {
  margin: 2px 0 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--text-secondary);
}

.loading-msg {
  padding: 40px var(--screen-pad);
  font-size: 18px;
  color: var(--text-faint);
  text-align: center;
}

.planung-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 8px var(--screen-pad) 24px;
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

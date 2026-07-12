<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import ToggleSwitch from '@/components/ui/ToggleSwitch.vue'
import { conflictsFor, personColor, personName, rangeLabel } from '@/utils/belegung'
import type { BookingDraft } from '@/composables/useBelegung'
import type { Booking, Couple, Resource } from '@/types'

const props = defineProps<{
  isOpen: boolean
  resources: readonly Resource[]
  bookings: readonly Booking[]
  couple: Couple | null
  currentUserId: string
  defaultDate: string // YYYY-MM-DD
}>()

const emit = defineEmits<{
  close: []
  submit: [draft: BookingDraft]
}>()

const resourceId = ref('')
const owner = ref('')
const date = ref('')
const allDay = ref(false)
const start = ref('09:00')
const end = ref('11:00')
const repeat = ref<'none' | 'weekly'>('none')
const note = ref('')

// Beim Öffnen frisch aufsetzen: eigene Person, heutiges Datum, erste Ressource.
watch(() => props.isOpen, (open) => {
  if (!open) return
  resourceId.value = props.resources[0]?.id ?? ''
  owner.value = props.currentUserId
  date.value = props.defaultDate
  allDay.value = false
  start.value = '09:00'
  end.value = '11:00'
  repeat.value = 'none'
  note.value = ''
})

const members = computed(() => props.couple?.memberIds ?? [])

const draft = computed<BookingDraft>(() => ({
  resourceId: resourceId.value,
  owner: owner.value,
  date: date.value,
  allDay: allDay.value,
  start: start.value,
  end: end.value,
  repeat: repeat.value,
  note: note.value,
}))

// Überschneidungen derselben Ressource am selben Tag — live, während der Entwurf
// noch bearbeitet wird.
const conflicts = computed(() => {
  if (!resourceId.value || !date.value) return []
  return conflictsFor(
    { resourceId: resourceId.value, allDay: allDay.value, start: start.value, end: end.value },
    props.bookings,
    date.value
  )
})

const conflictText = computed(() =>
  conflicts.value
    .map((c) => `${personName(props.couple, c.owner)} (${rangeLabel(c)})`)
    .join(', ')
)

const timesValid = computed(() => allDay.value || start.value < end.value)
const canSubmit = computed(
  () => !!resourceId.value && !!owner.value && !!date.value && timesValid.value
)
</script>

<template>
  <BottomSheet :isOpen="isOpen" @close="emit('close')">
    <!-- BottomSheet teleportiert nach <body>, liegt also außerhalb der
         .area-*-Klasse der Seite — ohne eigene Bereichsklasse fiele --accent im
         Sheet auf den Default (Terrakotta) zurück. Belegung gehört zur Planung. -->
    <div class="area-planung">
      <div class="sheet-head">
        <span class="sheet-heading">Neue Belegung</span>
        <span class="sheet-sub">Was, wann und wer</span>
      </div>

      <div class="section-label field-label">Ressource</div>
      <div class="chip-scroll">
        <button
          v-for="r in resources"
          :key="r.id"
          type="button"
          class="res-chip"
          :class="{ 'res-chip--active': r.id === resourceId }"
          @click="resourceId = r.id"
        >
          <span>{{ r.emoji }}</span>{{ r.name }}
        </button>
      </div>

      <div class="section-label field-label">Wer</div>
      <div class="segmented">
        <button
          v-for="uid in members"
          :key="uid"
          type="button"
          class="seg-btn"
          :class="{ 'seg-btn--active': owner === uid }"
          :style="owner === uid ? { background: personColor(couple, uid), color: 'var(--on-accent)' } : undefined"
          @click="owner = uid"
        >{{ personName(couple, uid) }}</button>
      </div>

      <div class="section-label field-label">Tag</div>
      <input v-model="date" class="app-field" type="date" />

      <div class="section-label field-label">Zeit</div>
      <div class="allday-row">
        <span class="allday-label">Ganztägig</span>
        <ToggleSwitch v-model="allDay" />
      </div>
      <div v-if="!allDay" class="time-row">
        <input v-model="start" class="app-field" type="time" />
        <span class="time-dash">–</span>
        <input v-model="end" class="app-field" type="time" />
      </div>
      <p v-if="!timesValid" class="time-hint">Das Ende muss nach dem Beginn liegen.</p>

      <div class="section-label field-label">Wiederholung</div>
      <div class="segmented">
        <button
          type="button"
          class="seg-btn"
          :class="{ 'seg-btn--active': repeat === 'none' }"
          @click="repeat = 'none'"
        >Einmalig</button>
        <button
          type="button"
          class="seg-btn"
          :class="{ 'seg-btn--active': repeat === 'weekly' }"
          @click="repeat = 'weekly'"
        >Wöchentlich ↻</button>
      </div>

      <div class="section-label field-label">Notiz — wofür?</div>
      <input v-model="note" class="app-field" type="text" placeholder="z. B. Zur Arbeit, Einkauf …" />

      <div v-if="conflicts.length" class="conflict-box">
        <span class="conflict-icon">⚠</span>
        <span class="conflict-text">
          Überschneidet sich mit {{ conflictText }}. Eintragen geht trotzdem.
        </span>
      </div>

      <button
        class="btn-primary submit-btn"
        type="button"
        :disabled="!canSubmit"
        @click="emit('submit', draft)"
      >
        {{ conflicts.length ? 'Trotzdem eintragen' : 'Eintragen' }}
      </button>
    </div>
  </BottomSheet>
</template>

<style scoped>
.sheet-head {
  display: flex;
  flex-direction: column;
  gap: 1px;
  margin-bottom: 16px;
  padding-right: 40px;
}

.sheet-heading {
  font-family: var(--font-headline);
  font-size: 21px;
  font-weight: 700;
  color: var(--text);
}

.sheet-sub {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--text-secondary);
}

.field-label {
  margin: 14px 0 7px;
}

.field-label:first-of-type {
  margin-top: 0;
}

.chip-scroll {
  display: flex;
  gap: 7px;
  overflow-x: auto;
  padding-bottom: 2px;
}

.res-chip {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border: 1px solid var(--border-soft);
  border-radius: var(--radius-chip);
  background: var(--surface);
  color: var(--text-secondary);
  font-family: var(--font-body);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}

.res-chip--active {
  border-color: var(--accent);
  background: var(--accent-tint);
  color: var(--accent);
}

.segmented {
  display: flex;
  gap: 4px;
  padding: 4px;
  border-radius: 12px;
  background: var(--surface-deep);
}

.seg-btn {
  flex: 1;
  padding: 9px 6px;
  border: none;
  border-radius: 9px;
  background: transparent;
  color: var(--text-secondary);
  font-family: var(--font-body);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.15s var(--ease-standard);
}

/* Personenfarbe kommt per :style; ohne Farbe (Wiederholung) der Akzent. */
.seg-btn--active {
  background: var(--accent);
  color: var(--on-accent);
}

.allday-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.allday-label {
  font-size: 13.5px;
  font-weight: 700;
  color: var(--text-secondary);
}

.time-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 10px;
}

.time-row .app-field {
  flex: 1;
}

.time-dash {
  color: var(--text-meta);
  font-weight: 700;
}

.time-hint {
  margin: 8px 0 0;
  font-size: 12px;
  font-weight: 700;
  color: var(--danger);
}

.conflict-box {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  margin-top: 14px;
  padding: 11px 13px;
  border: 1px solid var(--danger-border);
  border-radius: 12px;
  background: var(--danger-tint);
}

.conflict-icon {
  font-size: 15px;
  line-height: 1.2;
}

.conflict-text {
  font-size: 12.5px;
  font-weight: 700;
  color: var(--danger);
  line-height: 1.45;
}

.submit-btn {
  margin-top: 18px;
  gap: 6px;
}

</style>

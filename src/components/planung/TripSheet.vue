<script setup lang="ts">
import { computed, ref, watch, type Ref } from 'vue'
import type { Trip } from '@/types'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import { usePersistedRef, DRAFT_TTL_MS } from '@/composables/usePersistedRef'

const TRIP_EMOJIS = ['🧳', '✈️', '🏖️', '🏔️', '🏕️', '🗺️', '🚗', '🚆', '⛺', '🏙️', '🌋', '🎡'] as const

const props = defineProps<{
  isOpen: boolean
  editing?: Trip | null
  persistKey?: string
}>()

function draft<T>(field: string, initial: T): Ref<T> {
  return props.persistKey
    ? usePersistedRef<T>(`${props.persistKey}.${field}`, initial, { ttlMs: DRAFT_TTL_MS })
    : (ref(initial) as Ref<T>)
}

interface TripBasics {
  title: string
  emoji: string
  location: string
  startDate: string | null
  endDate: string | null
  when: string
  notes: string
}

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'submit', payload: TripBasics): void
}>()

const isEditing = computed(() => !!props.editing)

const title = draft('title', '')
const emoji = draft<string>('emoji', TRIP_EMOJIS[0])
const location = draft('location', '')
const startDate = draft('startDate', '')
const endDate = draft('endDate', '')
const when = draft('when', '')
const notes = draft('notes', '')

watch(() => props.isOpen, (open) => {
  if (!open) return
  const e = props.editing
  title.value = e?.title ?? ''
  emoji.value = e?.emoji || TRIP_EMOJIS[0]
  location.value = e?.location ?? ''
  startDate.value = e?.startDate ?? ''
  endDate.value = e?.endDate ?? ''
  when.value = e && e.when !== 'noch offen' ? e.when : ''
  notes.value = e?.notes ?? ''
})

function submit() {
  if (!title.value.trim()) return
  // Enddatum ohne Startdatum ergibt keinen Sinn — dann verwerfen.
  const start = startDate.value || null
  const end = start && endDate.value && endDate.value >= start ? endDate.value : null
  emit('submit', {
    title: title.value.trim(),
    emoji: emoji.value,
    location: location.value.trim(),
    startDate: start,
    endDate: end,
    when: when.value.trim(),
    notes: notes.value.trim(),
  })
}
</script>

<template>
  <BottomSheet :isOpen="isOpen" :title="isEditing ? 'Reise bearbeiten' : 'Neue Reise / Ausflug'" @close="emit('close')">
    <!-- Teleport nach <body>: ohne .area-planung fiele --accent auf Terrakotta zurück. -->
    <div class="area-planung">
      <div class="section-label label">Symbol</div>
      <div class="emoji-row">
        <button
          v-for="e in TRIP_EMOJIS"
          :key="e"
          type="button"
          class="emoji-btn"
          :class="{ 'emoji-btn--on': emoji === e }"
          @click="emoji = e"
        >{{ e }}</button>
      </div>

      <div class="section-label label">Wohin?</div>
      <input v-model="title" class="app-field field" placeholder="z. B. Städtetrip Kopenhagen" @keyup.enter="submit" />

      <div class="section-label label">Ziel / Ort <span class="label-opt">(optional)</span></div>
      <input v-model="location" class="app-field field" placeholder="z. B. Kopenhagen, DK" @keyup.enter="submit" />

      <div class="section-label label">Zeitraum <span class="label-opt">(optional)</span></div>
      <div class="range-row">
        <input v-model="startDate" class="app-field date-field" type="date" aria-label="Von" />
        <span class="range-dash">–</span>
        <input v-model="endDate" class="app-field date-field" type="date" aria-label="Bis" :min="startDate || undefined" />
      </div>
      <p class="date-hint">Mit Datum erscheint die Reise im Kalender.</p>

      <div class="section-label label">Grober Zeitraum <span class="label-opt">(Freitext, falls kein Datum)</span></div>
      <input v-model="when" class="app-field field" placeholder="z. B. im Herbst" @keyup.enter="submit" />

      <div class="section-label label">Notizen <span class="label-opt">(optional)</span></div>
      <textarea v-model="notes" class="app-field notes-field" rows="3" placeholder="Was ihr nicht vergessen wollt …" />

      <button class="btn-primary" :disabled="!title.trim()" @click="submit">
        {{ isEditing ? 'Änderungen speichern' : 'Reise merken' }}
      </button>
    </div>
  </BottomSheet>
</template>

<style scoped>
.label {
  margin-bottom: 7px;
}

.label-opt {
  font-weight: 700;
  text-transform: none;
  letter-spacing: 0;
  color: var(--text-faint);
}

.emoji-row {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 6px;
  margin-bottom: 14px;
}

.emoji-btn {
  aspect-ratio: 1;
  border: 1px solid var(--border-soft);
  border-radius: 11px;
  background: var(--surface-deep);
  font-size: 20px;
  cursor: pointer;
  transition: transform 0.12s var(--ease-overshoot), border-color 0.15s var(--ease-standard);
}

.emoji-btn--on {
  border-color: var(--accent);
  background: var(--accent-tint);
  transform: scale(1.05);
}

.field {
  margin-bottom: 14px;
}

.range-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.date-field {
  flex: 1;
  min-width: 0;
  margin-bottom: 0;
}

.range-dash {
  color: var(--text-meta);
  font-weight: 800;
}

.date-hint {
  margin: 7px 0 14px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-meta);
}

.notes-field {
  margin-bottom: 16px;
  resize: vertical;
  min-height: 72px;
  line-height: 1.5;
}
</style>

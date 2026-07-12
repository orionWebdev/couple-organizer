<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { useCouple } from '@/composables/useCouple'
import { useBelegung, type BookingDraft } from '@/composables/useBelegung'
import { showToast } from '@/composables/useToast'
import {
  WEEKDAYS_LONG, addDays, bookingsOnDay, conflictsFor, dayMonth, fromDateKey, toMin, weekdayIndex
} from '@/utils/belegung'
import { dateKey } from '@/utils/mealplan'
import BookingRow from './BookingRow.vue'
import NewBookingSheet from './NewBookingSheet.vue'
import BookingDetailSheet from './BookingDetailSheet.vue'
import type { Booking } from '@/types'

// Timeline direkt auf dem Dashboard — es gibt keinen eigenen Belegung-Screen.
//
// Eingeklappt: die nächsten PREVIEW_DAYS Tage als konkrete Termine (inkl. der
// Vorkommen wöchentlicher Serien), gedeckelt auf MAX_ROWS.
//
// Ausgeklappt: KEIN Zeithorizont. Wöchentliche Serien haben kein Enddatum — sie
// über Wochen auszurollen erzeugt beliebig viele Zeilen. Stattdessen steht jede
// Serie genau EINMAL als Serie ("Jeden Mittwoch"), und daneben stehen die
// einmaligen Termine (endliche Menge). Die Liste kann so nicht mehr explodieren.
const PREVIEW_DAYS = 7
const MAX_ROWS = 5

const router = useRouter()
const { user } = useAuth()
const { couple } = useCouple()
const coupleId = computed(() => user.value?.coupleId ?? null)

const {
  resources, bookings, resourceById, addBooking, deleteBooking
} = useBelegung(coupleId)

const today = new Date()
const todayKey = dateKey(today)
const expanded = ref(false)

interface DayGroup { key: string; label: string; date: string; rows: Booking[] }

function dayLabel(date: Date, index: number): string {
  if (index === 0) return 'Heute'
  if (index === 1) return 'Morgen'
  return WEEKDAYS_LONG[weekdayIndex(date)]
}

// Konkrete Termine der nächsten Tage (Serien-Vorkommen inklusive).
const previewGroups = computed<DayGroup[]>(() => {
  const groups: DayGroup[] = []
  let shown = 0

  for (let i = 0; i < PREVIEW_DAYS; i++) {
    if (!expanded.value && shown >= MAX_ROWS) break

    const date = addDays(today, i)
    const key = dateKey(date)
    const list = bookingsOnDay(bookings.value, key)
    if (!list.length) continue

    const rows = expanded.value ? list : list.slice(0, MAX_ROWS - shown)
    shown += rows.length
    groups.push({ key, label: dayLabel(date, i), date: dayMonth(date), rows })
  }

  return groups
})

// Jede wöchentliche Serie genau einmal, nach Wochentag und Startzeit sortiert.
const series = computed(() =>
  bookings.value
    .filter((b) => b.repeat === 'weekly')
    .slice()
    .sort((a, b) => a.weekday - b.weekday || toMin(a.start) - toMin(b.start))
)

// Einmalige Termine jenseits der Vorschauwoche — endlich, daher ohne Horizont.
const laterGroups = computed<DayGroup[]>(() => {
  const firstKey = dateKey(addDays(today, PREVIEW_DAYS))
  const byDay = new Map<string, Booking[]>()

  for (const b of bookings.value) {
    if (b.repeat === 'weekly' || b.date < firstKey) continue
    const list = byDay.get(b.date) ?? []
    list.push(b)
    byDay.set(b.date, list)
  }

  return [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, rows]) => {
      const date = fromDateKey(key)
      return {
        key,
        label: WEEKDAYS_LONG[weekdayIndex(date)],
        date: dayMonth(date),
        rows: rows.sort((a, b) => Number(b.allDay) - Number(a.allDay) || toMin(a.start) - toMin(b.start)),
      }
    })
})

// Was die eingeklappte Karte verschweigt: alles außer den gezeigten Zeilen.
const hiddenCount = computed(() => {
  const shown = previewGroups.value.reduce((n, g) => n + g.rows.length, 0)
  const previewTotal = Array.from({ length: PREVIEW_DAYS }, (_, i) =>
    bookingsOnDay(bookings.value, dateKey(addDays(today, i))).length
  ).reduce((a, b) => a + b, 0)
  const later = laterGroups.value.reduce((n, g) => n + g.rows.length, 0)
  return Math.max(0, previewTotal - shown) + series.value.length + later
})

const isEmpty = computed(() =>
  !previewGroups.value.length && !series.value.length && !laterGroups.value.length
)

function hasConflict(booking: Booking, key: string): boolean {
  return conflictsFor(booking, bookings.value, key).length > 0
}

// Serien-Zeile: der Konflikt-Check hängt am konkreten Tag, für die Serie selbst
// prüfen wir ihr eigenes Startdatum.
function seriesConflict(booking: Booking): boolean {
  return conflictsFor(booking, bookings.value, booking.date).length > 0
}

// ── Sheets ────────────────────────────────────────────────────────
const showNew = ref(false)
const selectedBookingId = ref<string | null>(null)

// Aus der Liste gelesen statt kopiert, damit das Detail-Sheet beim Löschen zugeht.
const selectedBooking = computed(
  () => bookings.value.find((b) => b.id === selectedBookingId.value) ?? null
)

async function handleSubmit(draft: BookingDraft) {
  const ok = await addBooking(draft)
  showToast(ok ? 'Belegung eingetragen ✓' : 'Fehler beim Speichern')
  if (ok) showNew.value = false
}

async function handleDelete() {
  if (!selectedBooking.value) return
  const ok = await deleteBooking(selectedBooking.value.id)
  showToast(ok ? 'Gelöscht' : 'Fehler beim Löschen')
  if (ok) selectedBookingId.value = null
}
</script>

<template>
  <div class="belegung-card">
    <div class="card-head">
      <span class="head-icon">🗓️</span>
      <span class="head-title">Belegung</span>
      <button
        type="button"
        class="add-btn"
        aria-label="Neue Belegung"
        :disabled="!resources.length"
        @click="showNew = true"
      >＋</button>
    </div>

    <!-- Ohne Ressourcen gibt es nichts zu belegen — Einstieg in die Einstellungen. -->
    <button v-if="!resources.length" type="button" class="setup-hint" @click="router.push('/settings')">
      Legt zuerst eure Ressourcen an — Auto, E-Bike, Hund … ›
    </button>

    <div v-else-if="isEmpty" class="card-empty">Nichts geplant — alles frei ✨</div>

    <template v-else>
      <div class="timeline">
        <div v-for="group in previewGroups" :key="group.key" class="day-group">
          <span class="day-label">
            {{ group.label }} <span class="day-date">· {{ group.date }}</span>
          </span>
          <BookingRow
            v-for="booking in group.rows"
            :key="booking.id"
            :booking="booking"
            :resource="resourceById[booking.resourceId]"
            :couple="couple"
            :conflict="hasConflict(booking, group.key)"
            @click="selectedBookingId = booking.id"
          />
        </div>

        <template v-if="expanded">
          <!-- Serien einmalig, nicht Woche für Woche ausgerollt -->
          <div v-if="series.length" class="day-group">
            <span class="day-label">Wöchentlich</span>
            <div v-for="booking in series" :key="booking.id" class="series-item">
              <span class="series-when">Jeden {{ WEEKDAYS_LONG[booking.weekday] }}</span>
              <BookingRow
                :booking="booking"
                :resource="resourceById[booking.resourceId]"
                :couple="couple"
                :conflict="seriesConflict(booking)"
                @click="selectedBookingId = booking.id"
              />
            </div>
          </div>

          <div v-for="group in laterGroups" :key="group.key" class="day-group">
            <span class="day-label">
              {{ group.label }} <span class="day-date">· {{ group.date }}</span>
            </span>
            <BookingRow
              v-for="booking in group.rows"
              :key="booking.id"
              :booking="booking"
              :resource="resourceById[booking.resourceId]"
              :couple="couple"
              :conflict="hasConflict(booking, group.key)"
              @click="selectedBookingId = booking.id"
            />
          </div>
        </template>
      </div>

      <button
        v-if="expanded || hiddenCount"
        type="button"
        class="expand-btn"
        @click="expanded = !expanded"
      >
        {{ expanded ? 'Weniger anzeigen ▴' : `Alle Termine anzeigen (+${hiddenCount}) ▾` }}
      </button>
    </template>

    <NewBookingSheet
      :isOpen="showNew"
      :resources="resources"
      :bookings="bookings"
      :couple="couple"
      :currentUserId="user?.uid ?? ''"
      :defaultDate="todayKey"
      @close="showNew = false"
      @submit="handleSubmit"
    />

    <BookingDetailSheet
      :booking="selectedBooking"
      :resource="selectedBooking ? resourceById[selectedBooking.resourceId] : undefined"
      :couple="couple"
      @close="selectedBookingId = null"
      @delete="handleDelete"
    />
  </div>
</template>

<style scoped>
.card-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.head-icon {
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 9px;
  background: var(--bucket);
  font-size: 13px;
}

.head-title {
  flex: 1;
  min-width: 0;
  font-family: var(--font-headline);
  font-size: 14px;
  font-weight: 700;
  color: var(--text);
}

.add-btn {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 50%;
  background: var(--bucket);
  color: #fff;
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
}

.add-btn:disabled {
  opacity: 0.4;
  pointer-events: none;
}

.add-btn:active {
  transform: scale(0.92);
}

.setup-hint {
  width: 100%;
  padding: 12px;
  border: 1.5px dashed var(--border);
  border-radius: var(--radius-tile);
  background: transparent;
  color: var(--text-meta);
  font-family: var(--font-body);
  font-size: 12.5px;
  font-weight: 700;
  text-align: left;
  cursor: pointer;
}

.card-empty {
  padding: 6px 0 2px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-meta);
}

.timeline {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.day-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.day-label {
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.6px;
  text-transform: uppercase;
  color: var(--text-meta);
}

.day-date {
  font-weight: 700;
  color: var(--text-faint);
  letter-spacing: 0;
}

.series-item {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.series-when {
  font-size: 11px;
  font-weight: 700;
  color: var(--text-secondary);
}

.expand-btn {
  width: 100%;
  margin-top: 10px;
  padding: 8px 0;
  border: none;
  border-radius: 10px;
  background: transparent;
  color: var(--bucket);
  font-family: var(--font-body);
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.expand-btn:active {
  background: var(--surface);
}
</style>

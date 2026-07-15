<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { useCouple } from '@/composables/useCouple'
import { useBelegung, type BookingDraft } from '@/composables/useBelegung'
import { showToast } from '@/composables/useToast'
import {
  WEEKDAYS_SHORT, WEEKDAYS_LONG, weekdayIndex, monthGrid, monthLabel, addMonths,
  firstOfMonth, sameMonth, dayMonth, expandDays, bookingsOnDay, conflictsFor,
  nextLabel, personColor, fromDateKey, todayKey,
} from '@/utils/belegung'
import { dateKey } from '@/utils/mealplan'
import type { Booking } from '@/types'
import FabButton from '@/components/ui/FabButton.vue'
import BookingRow from '@/components/belegung/BookingRow.vue'
import NewBookingSheet from '@/components/belegung/NewBookingSheet.vue'
import BookingDetailSheet from '@/components/belegung/BookingDetailSheet.vue'

const router = useRouter()
const { user } = useAuth()
const { couple } = useCouple()
const coupleId = computed(() => user.value?.coupleId ?? null)

const {
  bookings, resources, resourceById, loading,
  addBooking, deleteBooking,
} = useBelegung(coupleId)

// ── Monat ─────────────────────────────────────────────────────
// Das Fenster ist immer genau ein Monatsraster (volle Wochen Mo–So). Serien
// bleiben eine Regel und werden nur in dieses Fenster hinein aufgelöst.
const anchor = ref(firstOfMonth(new Date()))
const selectedKey = ref(todayKey())

const days = computed(() => monthGrid(anchor.value))
const byDay = computed(() => expandDays(bookings.value, days.value))

const selectedDate = computed(() => fromDateKey(selectedKey.value))
const selectedList = computed(() => bookingsOnDay(bookings.value, selectedKey.value))

const isToday = (date: Date) => dateKey(date) === todayKey()
const isSelected = (date: Date) => dateKey(date) === selectedKey.value
const isCurrentMonth = computed(() => sameMonth(anchor.value, new Date()))

// Ein Tag aus einem Nachbarmonat blättert mit — sonst läge die Auswahl in einer
// Zelle, die gleich aus dem Raster fällt.
function selectDay(date: Date) {
  selectedKey.value = dateKey(date)
  if (!sameMonth(date, anchor.value)) anchor.value = firstOfMonth(date)
}

function shiftMonth(delta: number) {
  anchor.value = addMonths(anchor.value, delta)

  // Auswahl mitnehmen: im aktuellen Monat auf heute, sonst auf den Ersten.
  const today = new Date()
  selectedKey.value = dateKey(sameMonth(anchor.value, today) ? today : anchor.value)
}

function backToToday() {
  anchor.value = firstOfMonth(new Date())
  selectedKey.value = todayKey()
}

function conflictOn(booking: Booking): boolean {
  return conflictsFor(booking, bookings.value, selectedKey.value).length > 0
}

// ── Serien: jede Regel genau einmal, mit berechnetem nächsten Termin ──
const series = computed(() =>
  bookings.value
    .filter((b) => b.repeat === 'weekly')
    .slice()
    .sort((a, b) => a.weekday - b.weekday || a.start.localeCompare(b.start))
)

function seriesLabel(booking: Booking): string {
  const resource = resourceById.value[booking.resourceId]?.name ?? 'Ressource'
  return `${resource} · jeden ${WEEKDAYS_LONG[booking.weekday]}`
}

// ── Sheets ────────────────────────────────────────────────────
const showNew = ref(false)
const detail = ref<Booking | null>(null)

async function onSubmit(draft: BookingDraft) {
  const conflicts = conflictsFor(draft, bookings.value, draft.date)
  const ok = await addBooking(draft)
  showNew.value = false
  if (!ok) {
    showToast('Fehler beim Speichern')
    return
  }
  showToast(conflicts.length ? 'Eingetragen — mit Überschneidung ⚠' : 'Belegung eingetragen ✓')
}

async function onDelete() {
  if (!detail.value) return
  const ok = await deleteBooking(detail.value.id)
  detail.value = null
  showToast(ok ? 'Gelöscht' : 'Fehler beim Löschen')
}

function openNew() {
  if (!resources.value.length) {
    showToast('Legt zuerst eine Ressource an (Einstellungen)')
    return
  }
  showNew.value = true
}
</script>

<template>
  <div class="kalender-page area-planung">
    <div class="page-header">
      <button class="back-btn" type="button" aria-label="Zurück" @click="router.back()">‹</button>
      <div>
        <h1 class="page-title">Belegung</h1>
        <p class="page-subtitle">Geteilte Ressourcen · Kalender</p>
      </div>
    </div>

    <div class="month-nav">
      <button class="nav-btn" type="button" aria-label="Vorheriger Monat" @click="shiftMonth(-1)">‹</button>
      <span class="month-label">{{ monthLabel(anchor) }}</span>
      <button class="nav-btn" type="button" aria-label="Nächster Monat" @click="shiftMonth(1)">›</button>
    </div>

    <div v-if="!isCurrentMonth" class="today-row">
      <button class="today-pill" type="button" @click="backToToday">↩ Heute</button>
    </div>

    <div v-if="loading" class="loading-msg">Laden…</div>

    <div v-else class="kalender-body">
      <!-- Monatsraster -->
      <div class="card cal-card">
        <div class="cal-weekdays">
          <span v-for="wd in WEEKDAYS_SHORT" :key="wd" class="cal-wd">{{ wd }}</span>
        </div>

        <div class="cal-grid">
          <button
            v-for="(date, i) in days"
            :key="dateKey(date)"
            type="button"
            class="cal-day"
            :class="{
              'cal-day--selected': isSelected(date),
              'cal-day--muted': !sameMonth(date, anchor),
            }"
            @click="selectDay(date)"
          >
            <span class="cal-date" :class="{ 'cal-date--today': isToday(date) }">
              {{ date.getDate() }}
            </span>
            <span class="cal-dots">
              <span
                v-for="booking in byDay[i].slice(0, 3)"
                :key="booking.id"
                class="dot"
                :style="{ background: personColor(couple, booking.owner) }"
              />
              <span v-if="byDay[i].length > 3" class="cal-more">+{{ byDay[i].length - 3 }}</span>
            </span>
          </button>
        </div>
      </div>

      <!-- Tages-Detail: öffnet sich direkt unter dem Kalender -->
      <div class="card day-card">
        <div class="day-head">
          <span class="day-name">{{ WEEKDAYS_LONG[weekdayIndex(selectedDate)] }}</span>
          <span class="day-date">{{ dayMonth(selectedDate) }}</span>
        </div>

        <BookingRow
          v-for="booking in selectedList"
          :key="booking.id"
          :booking="booking"
          :resource="resourceById[booking.resourceId]"
          :couple="couple"
          :conflict="conflictOn(booking)"
          @click="detail = booking"
        />

        <button class="add-row" type="button" @click="openNew">
          <span class="add-plus">＋</span>
          {{ selectedList.length ? 'hinzufügen' : 'frei — Belegung anlegen' }}
        </button>
      </div>

      <!-- Serien: eine Zeile je Regel, nicht je Termin -->
      <div v-if="series.length" class="card series-card">
        <div class="section-label series-label">↻ Serien · {{ series.length }}</div>
        <div class="series-list">
          <button
            v-for="booking in series"
            :key="booking.id"
            type="button"
            class="series-row"
            :style="{ borderLeftColor: personColor(couple, booking.owner) }"
            @click="detail = booking"
          >
            <span class="series-icon">{{ resourceById[booking.resourceId]?.emoji ?? '•' }}</span>
            <span class="series-text">
              <span class="series-title">{{ seriesLabel(booking) }}</span>
              <span class="series-next">Nächster: {{ nextLabel(booking, new Date()) }}</span>
            </span>
          </button>
        </div>
      </div>
    </div>

    <FabButton label="Belegung anlegen" @click="openNew" />

    <NewBookingSheet
      :isOpen="showNew"
      :resources="resources"
      :bookings="bookings"
      :couple="couple"
      :currentUserId="user?.uid ?? ''"
      :defaultDate="selectedKey"
      @close="showNew = false"
      @submit="onSubmit"
    />

    <BookingDetailSheet
      :booking="detail"
      :resource="detail ? resourceById[detail.resourceId] : undefined"
      :couple="couple"
      @close="detail = null"
      @delete="onDelete"
    />
  </div>
</template>

<style scoped>
.kalender-page {
  min-height: 100%;
  padding-bottom: 24px;
}

.page-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: calc(var(--safe-top) + 16px) var(--screen-pad) 8px;
}

.back-btn {
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  border: 1px solid var(--border-soft);
  border-radius: 50%;
  background: var(--surface);
  color: var(--text-secondary);
  font-size: 18px;
  cursor: pointer;
}

.page-title {
  margin: 0;
  font-family: var(--font-headline);
  font-size: 22px;
  font-weight: 700;
  line-height: 1.05;
  color: var(--text);
}

.page-subtitle {
  margin: 0;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--text-secondary);
}

.month-nav {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px var(--screen-pad) 0;
}

.nav-btn {
  width: 38px;
  height: 38px;
  flex-shrink: 0;
  border: 1px solid var(--border-soft);
  border-radius: 12px;
  background: var(--surface);
  color: var(--text-secondary);
  font-family: var(--font-headline);
  font-size: 20px;
  cursor: pointer;
}

.month-label {
  flex: 1;
  text-align: center;
  font-family: var(--font-headline);
  font-size: 18px;
  font-weight: 600;
  color: var(--text);
}

.today-row {
  display: flex;
  justify-content: center;
  margin-top: 10px;
}

.today-pill {
  padding: 6px 14px;
  border: none;
  border-radius: 999px;
  background: var(--accent-tint);
  color: var(--accent);
  font-family: var(--font-body);
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
}

.loading-msg {
  padding: 40px var(--screen-pad);
  color: var(--text-faint);
  text-align: center;
}

.kalender-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px var(--screen-pad) 90px;
}

.card {
  background: var(--surface);
  border: 1px solid var(--border-softer);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-card);
}

.cal-card {
  padding: 12px 10px;
}

.cal-weekdays,
.cal-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
}

.cal-weekdays {
  margin-bottom: 6px;
}

.cal-wd {
  text-align: center;
  font-size: 11px;
  font-weight: 800;
  color: var(--text-meta);
}

.cal-day {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 5px;
  min-height: 54px;
  padding: 6px 1px;
  border: 1.5px solid transparent;
  border-radius: 12px;
  background: transparent;
  cursor: pointer;
}

.cal-day--selected {
  border-color: var(--accent);
  background: var(--accent-tint);
}

.cal-day--muted .cal-date {
  color: var(--text-faint);
}

.cal-date {
  width: 30px;
  height: 30px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  font-family: var(--font-headline);
  font-size: 16px;
  font-weight: 600;
  color: var(--text);
}

.cal-day--selected .cal-date {
  color: var(--accent);
}

.cal-date--today {
  background: var(--accent);
  color: var(--on-accent);
}

.cal-day--selected .cal-date--today,
.cal-day--muted .cal-date--today {
  color: var(--on-accent);
}

.cal-dots {
  display: flex;
  align-items: center;
  gap: 3px;
  height: 6px;
}

.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.cal-more {
  font-size: 9px;
  font-weight: 800;
  color: var(--text-faint);
}

.day-card {
  padding: 16px;
}

.day-head {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 12px;
}

.day-name {
  font-family: var(--font-headline);
  font-size: 18px;
  font-weight: 600;
  color: var(--text);
}

.day-date {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-meta);
}

.add-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 13px;
  border: 1.5px dashed var(--border);
  border-radius: var(--radius-tile);
  background: transparent;
  color: var(--text-meta);
  font-family: var(--font-body);
  font-size: 13.5px;
  font-weight: 700;
  cursor: pointer;
}

.add-plus {
  font-size: 15px;
  line-height: 1;
}

.series-card {
  padding: 14px;
}

.series-label {
  margin-bottom: 10px;
}

.series-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.series-row {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 9px 11px;
  text-align: left;
  border: none;
  border-left: 3px solid var(--border);
  border-radius: var(--radius-tile);
  background: var(--surface-deep);
  cursor: pointer;
}

.series-icon {
  width: 30px;
  height: 30px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  border-radius: 9px;
  background: var(--surface);
  font-size: 15px;
}

.series-text {
  flex: 1;
  min-width: 0;
}

.series-title {
  display: block;
  font-size: 13.5px;
  font-weight: 800;
  color: var(--text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.series-next {
  display: block;
  font-size: 12px;
  font-weight: 700;
  color: var(--text-secondary);
}
</style>

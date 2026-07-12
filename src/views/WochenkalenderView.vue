<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { useCouple } from '@/composables/useCouple'
import { useBelegung, type BookingDraft } from '@/composables/useBelegung'
import { showToast } from '@/composables/useToast'
import {
  WEEKDAYS_SHORT, WEEKDAYS_LONG, mondayOf, weekDates, addDays, weekdayIndex,
  isoWeek, dayMonth, expandWeek, conflictsFor, nextLabel, personColor,
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

// ── Woche ─────────────────────────────────────────────────────
// Der Zeithorizont ist immer genau eine Woche — egal wie viele Serien es gibt.
const weekOffset = ref(0)
const selectedDay = ref(weekdayIndex(new Date()))

const monday = computed(() => addDays(mondayOf(new Date()), weekOffset.value * 7))
const week = computed(() => weekDates(monday.value))
const byDay = computed(() => expandWeek(bookings.value, week.value))

const isCurrentWeek = computed(() => weekOffset.value === 0)
const todayIndex = computed(() => (isCurrentWeek.value ? weekdayIndex(new Date()) : -1))

const rangeText = computed(() => {
  const days = week.value
  return `${days[0].getDate()}. – ${dayMonth(days[6])}`
})

const selectedDate = computed(() => week.value[selectedDay.value])
const selectedKey = computed(() => dateKey(selectedDate.value))
const selectedList = computed(() => byDay.value[selectedDay.value] ?? [])

function backToToday() {
  weekOffset.value = 0
  selectedDay.value = weekdayIndex(new Date())
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
        <p class="page-subtitle">Geteilte Ressourcen · ganze Woche</p>
      </div>
    </div>

    <div class="week-nav">
      <button class="nav-btn" type="button" aria-label="Vorherige Woche" @click="weekOffset--">‹</button>
      <div class="week-label">
        <span class="kw">KW {{ isoWeek(monday) }}</span>
        <span class="range">{{ rangeText }}</span>
      </div>
      <button class="nav-btn" type="button" aria-label="Nächste Woche" @click="weekOffset++">›</button>
    </div>

    <div v-if="!isCurrentWeek" class="today-row">
      <button class="today-pill" type="button" @click="backToToday">↩ Heute · aktuelle KW</button>
    </div>

    <div v-if="loading" class="loading-msg">Laden…</div>

    <div v-else class="kalender-body">
      <!-- Wochen-Grid -->
      <div class="card grid-card">
        <div class="week-grid">
          <button
            v-for="(date, day) in week"
            :key="dateKey(date)"
            type="button"
            class="grid-day"
            :class="{ 'grid-day--selected': day === selectedDay }"
            @click="selectedDay = day"
          >
            <span class="grid-wd">{{ WEEKDAYS_SHORT[day] }}</span>
            <span
              class="grid-date"
              :class="{ 'grid-date--today': day === todayIndex }"
            >{{ date.getDate() }}</span>
            <span class="grid-dots">
              <span
                v-for="booking in byDay[day].slice(0, 3)"
                :key="booking.id"
                class="dot"
                :style="{ background: personColor(couple, booking.owner) }"
              />
              <span v-if="byDay[day].length > 3" class="grid-more">+{{ byDay[day].length - 3 }}</span>
            </span>
          </button>
        </div>
      </div>

      <!-- Tages-Detail -->
      <div class="card day-card">
        <div class="day-head">
          <span class="day-name">{{ WEEKDAYS_LONG[selectedDay] }}</span>
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

.week-nav {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px var(--screen-pad) 0;
}

.nav-btn {
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  border: 1px solid var(--border-soft);
  border-radius: 10px;
  background: var(--surface);
  color: var(--text-secondary);
  font-family: var(--font-headline);
  font-size: 18px;
  cursor: pointer;
}

.week-label {
  flex: 1;
  text-align: center;
}

.kw {
  display: block;
  font-family: var(--font-headline);
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
}

.range {
  display: block;
  font-size: 11px;
  font-weight: 700;
  color: var(--text-meta);
}

.today-row {
  display: flex;
  justify-content: center;
  margin-top: 8px;
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
  padding: 12px var(--screen-pad) 90px;
}

.card {
  background: var(--surface);
  border: 1px solid var(--border-softer);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-card);
}

.grid-card {
  padding: 10px;
}

.week-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 3px;
}

.grid-day {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 6px 1px 7px;
  border: 1.5px solid transparent;
  border-radius: 11px;
  background: transparent;
  cursor: pointer;
}

.grid-day--selected {
  border-color: var(--accent);
  background: var(--accent-tint);
}

.grid-wd {
  font-size: 9.5px;
  font-weight: 800;
  color: var(--text-meta);
}

.grid-date {
  width: 26px;
  height: 26px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  font-family: var(--font-headline);
  font-size: 14.5px;
  font-weight: 600;
  color: var(--text);
}

.grid-day--selected .grid-date {
  color: var(--accent);
}

.grid-date--today {
  background: var(--accent);
  color: var(--on-accent);
}

.grid-day--selected .grid-date--today {
  color: var(--on-accent);
}

.grid-dots {
  display: flex;
  align-items: center;
  gap: 2px;
  height: 6px;
}

.dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
}

.grid-more {
  font-size: 8px;
  font-weight: 800;
  color: var(--text-faint);
}

.day-card {
  padding: 14px;
}

.day-head {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 10px;
}

.day-name {
  font-family: var(--font-headline);
  font-size: 17px;
  font-weight: 600;
  color: var(--text);
}

.day-date {
  font-size: 12px;
  font-weight: 700;
  color: var(--text-meta);
}

.add-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 12px;
  border: 1.5px dashed var(--border);
  border-radius: var(--radius-tile);
  background: transparent;
  color: var(--text-meta);
  font-family: var(--font-body);
  font-size: 13px;
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

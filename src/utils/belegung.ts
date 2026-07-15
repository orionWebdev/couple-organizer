import type { Booking, Couple } from '@/types'
import { dateKey } from './mealplan'

// Woche = Montag–Sonntag, day/weekday: 0 = Montag … 6 = Sonntag.
export const WEEKDAYS_SHORT = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'] as const
export const WEEKDAYS_LONG = [
  'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'
] as const

// Icon-Set für frei angelegte Ressourcen (Fahrzeuge, Tiere/Haus, Werkzeug,
// Freizeit, Technik, Haushalt) — aus der Design-Referenz.
export const RESOURCE_ICONS = [
  '🚗', '🚙', '🏍️', '🛵', '🚲', '🛴', '🅿️', '⛽',
  '🐕', '🐈', '🪴', '🌱', '🏠', '🛋️', '🧺', '🚿',
  '🧰', '🔧', '🪛', '🔩', '📷', '🎥', '🎮', '🕹️',
  '🎸', '🎹', '🎿', '⛺', '🛶', '🏓', '🧗', '🎣',
  '💻', '🖨️', '📺', '🔌', '🍳', '☕', '🧊', '🧴'
] as const

// ── Zeit ──────────────────────────────────────────────────────────
export function toMin(time: string): number {
  const [h, m] = time.split(':')
  return Number(h) * 60 + Number(m)
}

export function rangeLabel(booking: Pick<Booking, 'allDay' | 'start' | 'end'>): string {
  return booking.allDay ? 'ganztägig' : `${booking.start}–${booking.end}`
}

// Ganztägig überlappt alles.
export function overlaps(
  a: Pick<Booking, 'allDay' | 'start' | 'end'>,
  b: Pick<Booking, 'allDay' | 'start' | 'end'>
): boolean {
  if (a.allDay || b.allDay) return true
  return toMin(a.start) < toMin(b.end) && toMin(b.start) < toMin(a.end)
}

// ── Woche ─────────────────────────────────────────────────────────
export function weekdayIndex(date: Date): number {
  return (date.getDay() + 6) % 7 // So=0 → 6, Mo=1 → 0
}

export function mondayOf(date: Date): Date {
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate() - weekdayIndex(date))
  monday.setHours(0, 0, 0, 0)
  return monday
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days)
}

export function weekDates(monday: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i))
}

// ── Monat ─────────────────────────────────────────────────────────
export function firstOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

export function addMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, 1)
}

export function sameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()
}

// Das Monatsraster des Kalenders: volle Wochen Mo–So, die den Monat abdecken —
// je nach Monat 4 (Februar, wenn er auf einem Montag beginnt) bis 6 Zeilen. Die
// Tage aus den Nachbarmonaten gehören dazu, sonst hätte das Gitter Löcher.
export function monthGrid(anchor: Date): Date[] {
  const start = mondayOf(firstOfMonth(anchor))
  const end = addDays(mondayOf(new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0)), 6)
  const days: Date[] = []
  for (let day = start; day <= end; day = addDays(day, 1)) days.push(day)
  return days
}

const monthYearFormatter = new Intl.DateTimeFormat('de-DE', { month: 'long', year: 'numeric' })

export function monthLabel(date: Date): string {
  return monthYearFormatter.format(date)
}

// Ganze Wochen zwischen zwei Montagen — über die Zeitdifferenz gerundet, damit
// Sommer-/Winterzeit (23- bzw. 25-Stunden-Tage) nicht danebenliegt.
export function weekOffsetBetween(fromMonday: Date, toMonday: Date): number {
  return Math.round((toMonday.getTime() - fromMonday.getTime()) / (7 * 86400000))
}

// ISO-8601-Kalenderwoche (Woche 1 = die Woche mit dem 4. Januar).
export function isoWeek(date: Date): number {
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  target.setDate(target.getDate() + 3 - weekdayIndex(target)) // Donnerstag dieser Woche
  const week1 = new Date(target.getFullYear(), 0, 4)
  const diffDays = (target.getTime() - week1.getTime()) / 86400000
  return 1 + Math.round((diffDays - 3 + weekdayIndex(week1)) / 7)
}

const dayMonthFormatter = new Intl.DateTimeFormat('de-DE', { day: 'numeric', month: 'short' })

export function dayMonth(date: Date): string {
  return dayMonthFormatter.format(date)
}

const bookedAtFormatter = new Intl.DateTimeFormat('de-DE', {
  day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
})

// Wann die Belegung eingetragen wurde. `createdAt` ist direkt nach dem Anlegen
// noch null (serverTimestamp ist bis zur Server-Bestätigung nicht aufgelöst).
export function bookedAtLabel(createdAt: Booking['createdAt'] | null): string {
  if (!createdAt) return 'gerade eben'
  return `${bookedAtFormatter.format(createdAt.toDate())} Uhr`
}

// ── Occurrences: Booking → konkreter Tag ──────────────────────────
// Einmalige Belegungen liegen genau auf ihrem `date`; wöchentliche wiederholen
// sich ab ihrem Startdatum jede Woche am selben Wochentag (kein Enddatum).
// Der String-Vergleich funktioniert, weil beide Keys YYYY-MM-DD sind.
export function occursOn(booking: Booking, key: string): boolean {
  if (booking.repeat === 'weekly') {
    return booking.weekday === weekdayIndex(fromDateKey(key)) && booking.date <= key
  }
  return booking.date === key
}

export function fromDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

// Alle Belegungen eines Tages, sortiert: ganztägig zuerst, dann nach Startzeit.
export function bookingsOnDay(bookings: readonly Booking[], key: string): Booking[] {
  return bookings
    .filter((b) => occursOn(b, key))
    .sort((a, b) => {
      if (a.allDay !== b.allDay) return a.allDay ? -1 : 1
      return toMin(a.start) - toMin(b.start)
    })
}

// Ein begrenztes Fenster (eine Woche, ein Monatsraster) auf konkrete Termine
// auflösen: pro Tag die Belegungen, die an ihm stattfinden. Das Fenster ist
// immer begrenzt — eine Serie bleibt EIN Datensatz und wird nie über einen
// offenen Zeithorizont ausgerollt.
export function expandDays(bookings: readonly Booking[], days: Date[]): Booking[][] {
  return days.map((date) => bookingsOnDay(bookings, dateKey(date)))
}

export function expandWeek(bookings: readonly Booking[], week: Date[]): Booking[][] {
  return expandDays(bookings, week)
}

// Nächster konkreter Termin einer Belegung ab (inklusive) `from`.
// Wöchentlich: der nächste passende Wochentag, frühestens am Serienstart.
// Einmalig: das eigene Datum, sofern es nicht vorbei ist.
export function nextOccurrence(booking: Booking, from: Date): Date | null {
  const start = fromDateKey(dateKey(from))
  const own = fromDateKey(booking.date)

  if (booking.repeat !== 'weekly') return own >= start ? own : null

  const search = own > start ? own : start
  for (let i = 0; i < 7; i++) {
    const day = addDays(search, i)
    if (weekdayIndex(day) === booking.weekday) return day
  }
  return null // unerreichbar, solange weekday in 0..6 liegt
}

// Menschliche Beschreibung des nächsten Termins ("heute · 18:00–22:00") — damit
// in der Serien-Liste nie verloren geht, wann eine Regel das nächste Mal fällt.
export function nextLabel(booking: Booking, from: Date): string {
  const next = nextOccurrence(booking, from)
  if (!next) return 'vorbei'

  const days = Math.round((next.getTime() - fromDateKey(dateKey(from)).getTime()) / 86400000)
  const when =
    days === 0 ? 'heute'
    : days === 1 ? 'morgen'
    : `${WEEKDAYS_LONG[weekdayIndex(next)]} ${dayMonth(next)}`

  return `${when} · ${rangeLabel(booking)}`
}

// Konflikt = zwei Belegungen derselben Ressource am selben Tag mit
// Zeitüberlappung. `candidate` darf ein noch nicht gespeicherter Entwurf sein
// (dann ohne id).
export function conflictsFor(
  candidate: Pick<Booking, 'resourceId' | 'allDay' | 'start' | 'end'> & { id?: string },
  bookings: readonly Booking[],
  key: string
): Booking[] {
  return bookingsOnDay(bookings, key).filter(
    (other) =>
      other.id !== candidate.id &&
      other.resourceId === candidate.resourceId &&
      overlaps(candidate, other)
  )
}

// ── Personen ──────────────────────────────────────────────────────
// Gleiche Zuordnung wie InitialChip: erstes Mitglied Terrakotta, zweites Türkis.
export function personColor(couple: Couple | null, uid: string): string {
  if (!couple) return 'var(--text-faint)'
  return couple.memberIds.indexOf(uid) === 0 ? 'var(--chris)' : 'var(--sarah)'
}

export function personTint(couple: Couple | null, uid: string): string {
  if (!couple) return 'var(--surface-deep)'
  return couple.memberIds.indexOf(uid) === 0 ? 'var(--chris-tint)' : 'var(--sarah-tint)'
}

export function personName(couple: Couple | null, uid: string): string {
  return couple?.memberNames[uid] ?? 'Unbekannt'
}

export function partnerId(couple: Couple | null, uid: string): string | null {
  return couple?.memberIds.find((id) => id !== uid) ?? null
}

export const todayKey = () => dateKey(new Date())

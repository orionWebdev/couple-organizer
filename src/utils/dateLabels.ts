// Kleine Formatierhelfer für die optionalen Datumsfelder von Ideen/Reisen
// (Schlüssel im Format YYYY-MM-DD, wie bei Belegung/Mealplan).

const badgeFmt = new Intl.DateTimeFormat('de-DE', { day: 'numeric', month: 'short' })
const fullFmt = new Intl.DateTimeFormat('de-DE', { weekday: 'short', day: 'numeric', month: 'short' })

function parseKey(key: string | null | undefined): Date | null {
  if (!key) return null
  const [y, m, d] = key.split('-').map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d)
}

// "12. Sept."
export function dateBadge(key: string | null | undefined): string {
  const d = parseKey(key)
  return d ? badgeFmt.format(d) : ''
}

// "Sa., 12. Sept."
export function dateFull(key: string | null | undefined): string {
  const d = parseKey(key)
  return d ? fullFmt.format(d) : ''
}

// "12.–15. Sept." bzw. "12. Sept." wenn kein/gleiches Enddatum.
export function rangeLabel(start: string | null | undefined, end?: string | null): string {
  if (!start) return ''
  if (!end || end === start) return dateBadge(start)
  return `${dateBadge(start)}–${dateBadge(end)}`
}

// Liegt `key` (YYYY-MM-DD) im Zeitraum [start, end]? Ohne end zählt nur der
// Starttag. Der String-Vergleich funktioniert, weil das Format sortierbar ist.
export function dayInRange(key: string, start: string | null | undefined, end?: string | null): boolean {
  if (!start) return false
  const last = end && end >= start ? end : start
  return key >= start && key <= last
}

// Ganze Tage von heute bis zum Datum (lokal, Uhrzeit ignoriert). Negativ =
// Vergangenheit. null, wenn der Schlüssel nicht parsebar ist.
export function daysUntil(key: string | null | undefined): number | null {
  const d = parseKey(key)
  if (!d) return null
  const startOfDay = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate())
  return Math.round((startOfDay(d).getTime() - startOfDay(new Date()).getTime()) / 86400000)
}

// "heute" · "morgen" · "in 5 Tagen" · "in 3 Wochen" · "vor 2 Tagen"
export function countdownLabel(key: string | null | undefined): string {
  const n = daysUntil(key)
  if (n === null) return ''
  if (n === 0) return 'heute'
  if (n === 1) return 'morgen'
  if (n === -1) return 'gestern'
  if (n > 0) return n < 14 ? `in ${n} Tagen` : `in ${Math.round(n / 7)} Wochen`
  const abs = -n
  return abs < 14 ? `vor ${abs} Tagen` : `vor ${Math.round(abs / 7)} Wochen`
}

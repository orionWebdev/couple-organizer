// Montag–Sonntag der Woche, die `reference` enthält.
export function currentWeekDates(reference = new Date()): Date[] {
  const day = reference.getDay() // 0=So, 1=Mo, ... 6=Sa
  const diffToMonday = day === 0 ? -6 : 1 - day
  const monday = new Date(reference.getFullYear(), reference.getMonth(), reference.getDate() + diffToMonday)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

export function dateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const weekdayFormatter = new Intl.DateTimeFormat('de-DE', { weekday: 'short' })
const dayMonthFormatter = new Intl.DateTimeFormat('de-DE', { day: 'numeric', month: 'short' })

export function weekdayLabel(date: Date): string {
  return weekdayFormatter.format(date).replace('.', '')
}

export function dayMonthLabel(date: Date): string {
  return dayMonthFormatter.format(date)
}

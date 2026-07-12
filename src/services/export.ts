// Premium-Feature: Ausgaben als CSV, Belegungen als Kalender-Datei.
// Nativ geht die Datei über das Android-Share-Sheet raus, im Browser über einen
// klassischen Download — der Aufrufer merkt davon nichts.
import { Share } from '@capacitor/share'
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem'
import { isNative } from './platform'
import type { Booking, Expense, Resource, Couple } from '@/types'

function nameOf(couple: Couple | null, uid: string): string {
  return couple?.memberNames?.[uid] ?? 'Unbekannt'
}

// Excel/Numbers stolpern über Felder mit Komma, Anführungszeichen oder Umbruch.
function csvCell(value: string | number): string {
  const s = String(value)
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function buildExpensesCsv(expenses: readonly Expense[], couple: Couple | null): string {
  const header = ['Monat', 'Titel', 'Betrag (EUR)', 'Kategorie', 'Bezahlt von', 'Beglichen']
  const rows = [...expenses]
    .sort((a, b) => a.monthKey.localeCompare(b.monthKey))
    .map((e) => [
      e.monthKey,
      e.title,
      // Deutsche Tabellen erwarten das Komma als Dezimaltrenner.
      (e.amount / 100).toFixed(2).replace('.', ','),
      e.category,
      nameOf(couple, e.paidBy),
      e.isPaid ? 'ja' : 'nein'
    ])

  // BOM voran, sonst zeigt Excel Umlaute als Mojibake.
  return '﻿' + [header, ...rows].map((r) => r.map(csvCell).join(';')).join('\r\n')
}

function icsDate(dateKey: string, time: string): string {
  return `${dateKey.replace(/-/g, '')}T${time.replace(':', '')}00`
}

export function buildBookingsIcs(
  bookings: readonly Booking[],
  resources: readonly Resource[],
  couple: Couple | null
): string {
  const resourceName = (id: string) => resources.find((r) => r.id === id)?.name ?? 'Ressource'

  const events = bookings.map((b) => {
    const summary = `${resourceName(b.resourceId)} — ${nameOf(couple, b.owner)}`
    const lines = [
      'BEGIN:VEVENT',
      `UID:${b.id}@together.app`,
      `SUMMARY:${summary}`,
      b.allDay
        ? `DTSTART;VALUE=DATE:${b.date.replace(/-/g, '')}`
        : `DTSTART:${icsDate(b.date, b.start)}`,
      b.allDay ? '' : `DTEND:${icsDate(b.date, b.end)}`,
      // Wochenserien haben bewusst kein Enddatum (siehe useBelegung).
      b.repeat === 'weekly' ? 'RRULE:FREQ=WEEKLY' : '',
      b.note ? `DESCRIPTION:${b.note.replace(/\n/g, '\\n')}` : '',
      'END:VEVENT'
    ]
    return lines.filter(Boolean).join('\r\n')
  })

  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Together//DE', ...events, 'END:VCALENDAR'].join('\r\n')
}

export async function saveOrShare(filename: string, content: string, mimeType: string): Promise<void> {
  if (!isNative) {
    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
    return
  }

  // Cache statt Documents: die Datei ist ein Transportmittel zum Share-Sheet,
  // kein Dokument, das die App dauerhaft besitzen will.
  const { uri } = await Filesystem.writeFile({
    path: filename,
    data: content,
    directory: Directory.Cache,
    encoding: Encoding.UTF8
  })

  await Share.share({ title: filename, url: uri })
}

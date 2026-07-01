import type { Chore, ChoreAssignee, Couple } from '@/types'

function toDate(timestamp: unknown): Date | null {
  if (timestamp && typeof timestamp === 'object' && 'toDate' in timestamp) {
    return (timestamp as { toDate: () => Date }).toDate()
  }
  return null
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()
}

export function isDoneToday(chore: Chore): boolean {
  if (chore.type === 'once') return chore.done
  const completed = toDate(chore.completedAt)
  if (!completed) return false
  return isSameDay(completed, new Date())
}

export type DueBucket = 'today' | 'none' | { days: number }

export function dueBucket(chore: Chore): DueBucket {
  const due = toDate(chore.dueDate)
  if (!due) return 'none'
  const now = new Date()
  if (isSameDay(due, now)) return 'today'
  const startOfDue = new Date(due.getFullYear(), due.getMonth(), due.getDate())
  const startOfNow = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const days = Math.round((startOfDue.getTime() - startOfNow.getTime()) / 86400000)
  return { days }
}

export function recurLabel(chore: Chore): string {
  if (chore.type === 'once') return 'Einmalig'
  if (chore.interval === 'täglich') return 'Täglich'
  if (chore.interval === 'monatlich') return 'Monatlich'
  return 'Wöchentlich'
}

const dueDateFormatter = new Intl.DateTimeFormat('de-DE', { weekday: 'short', day: 'numeric', month: 'short' })

export function metaLine(chore: Chore, couple: Couple | null): string {
  if (isDoneToday(chore)) {
    return `${chore.type === 'once' ? 'Erledigt' : 'Heute erledigt'} · ${personName(chore.completedBy, couple)}`
  }

  const bucket = dueBucket(chore)
  if (bucket === 'today') return 'Fällig · Heute'
  if (bucket !== 'none') {
    const due = toDate(chore.dueDate)
    return `Fällig · ${due ? dueDateFormatter.format(due) : ''}`
  }
  if (chore.assignee === null) return 'Offen · wartet auf Zuweisung'
  return recurLabel(chore)
}

export function personName(assignee: ChoreAssignee, couple: Couple | null): string {
  if (assignee === 'both') return 'Beide'
  if (!assignee) return 'Niemand'
  return couple?.memberNames[assignee] ?? 'Partner'
}

interface PersonVisual {
  init: string
  color: string
  tint: string
}

export function personVisual(uid: string, couple: Couple | null): PersonVisual {
  const idx = couple?.memberIds.indexOf(uid) ?? -1
  const name = couple?.memberNames[uid]
  return {
    init: name ? name.charAt(0).toUpperCase() : '?',
    color: idx === 0 ? 'var(--chris)' : 'var(--sarah)',
    tint: idx === 0 ? 'var(--chris-tint)' : 'var(--sarah-tint)'
  }
}

export interface AssigneeChip {
  ch: string
  bg: string
}

export function assigneeChips(assignee: ChoreAssignee, couple: Couple | null): AssigneeChip[] {
  if (assignee === 'both') {
    const [a, b] = couple?.memberIds ?? []
    return [a, b].filter(Boolean).map((uid) => {
      const v = personVisual(uid as string, couple)
      return { ch: v.init, bg: v.color }
    })
  }
  if (!assignee) return []
  const v = personVisual(assignee, couple)
  return [{ ch: v.init, bg: v.color }]
}

export interface AssigneeAvatarVisual {
  init: string
  bg: string
  border: string
  color: string
}

export function assigneeAvatarVisual(assignee: ChoreAssignee, couple: Couple | null): AssigneeAvatarVisual {
  if (assignee === 'both') {
    return {
      init: 'CS',
      bg: 'linear-gradient(90deg, var(--chris) 50%, var(--sarah) 50%)',
      border: 'none',
      color: '#15110d'
    }
  }
  if (!assignee) {
    return { init: '–', bg: 'transparent', border: '1px dashed #5a5048', color: 'var(--accent)' }
  }
  const v = personVisual(assignee, couple)
  return { init: v.init, bg: v.color, border: 'none', color: '#15110d' }
}

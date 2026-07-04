import type { Chore, ChoreHistoryEntry, ChorePoints, ChoreRoom } from '@/types'

// Auswählbare Punktwerte (aufsteigend nach Aufwand).
export const POINT_VALUES: readonly ChorePoints[] = [5, 10, 20, 30]

export const DEFAULT_POINTS: ChorePoints = 10

interface PointOption {
  value: ChorePoints
  label: string // Kurzbeschreibung der Aufgabengröße
}

// Für die Auswahl in den Aufgaben-Modals.
export const POINT_OPTIONS: readonly PointOption[] = [
  { value: 5, label: 'Klein' },
  { value: 10, label: 'Normal' },
  { value: 20, label: 'Groß' },
  { value: 30, label: 'XL' },
]

function normalize(name: string): string {
  return name.trim().toLowerCase()
}

// Schätzt einen fairen Punktwert allein aus dem Aufgabennamen (und optional dem
// Raum). Wird für die Migration von Altbestand ohne points-Feld und als
// robuster Fallback beim Rendern genutzt. Beispiele aus der Aufgabe:
// „Katzen füttern" = 5, „Wäsche waschen" = 20, „Einkaufen" = 30.
export function pointsForName(name: string, room?: ChoreRoom): ChorePoints {
  const n = normalize(name)

  // 30 — große Erledigungen außer Haus
  if (n.includes('einkauf') || n.includes('großeinkauf') || n.includes('wocheneinkauf')) return 30

  // 20 — aufwändige Reinigung / Wäschegang
  if (
    n.includes('wäsche waschen') ||
    n.includes('saugen') ||
    n.includes('wischen') ||
    n.includes('dusche') ||
    n.includes('toilette') ||
    n.includes('backofen') ||
    n.includes('kühlschrank') ||
    n.includes('abstauben') ||
    n.includes('fenster') ||
    (n.includes('auto') && n.includes('wasch')) ||
    n.includes('putzen')
  ) return 20

  // 5 — schnell erledigt
  if (
    n.includes('füttern') ||
    n.includes('bett machen') ||
    n.includes('müll raus') ||
    n.includes('gießen') ||
    n.includes('handtücher') ||
    n.includes('ausräumen') ||
    n.includes('leeren') ||
    n.includes('deko')
  ) return 5

  // Raum-basierter Fallback für alles Übrige
  if (room === 'einkaufen') return 30
  if (room === 'waesche' || room === 'auto') return 20
  if (room === 'haustiere' || room === 'pflanzen' || room === 'muell') return 5

  return DEFAULT_POINTS
}

// Liefert die Punkte einer Aufgabe robust gegen Altbestand ohne Feld.
export function pointsForChore(chore: Pick<Chore, 'name' | 'room' | 'points'>): ChorePoints {
  return isPointValue(chore.points) ? chore.points : pointsForName(chore.name, chore.room)
}

// Liefert die Punkte eines Verlauf-Eintrags robust gegen Altbestand ohne Feld.
export function pointsForHistory(entry: Pick<ChoreHistoryEntry, 'choreName' | 'points'>): ChorePoints {
  return isPointValue(entry.points) ? entry.points : pointsForName(entry.choreName)
}

export function isPointValue(value: unknown): value is ChorePoints {
  return value === 5 || value === 10 || value === 20 || value === 30
}

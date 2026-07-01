import type { Chore, ChoreRoom } from '@/types'

export interface RoomDef {
  id: ChoreRoom
  label: string
  icon: string // Emoji für die Filter-Chips
}

// Reihenfolge bestimmt die Anzeige in Filtern und Pickern.
export const ROOMS: readonly RoomDef[] = [
  { id: 'allgemein', label: 'Allgemein', icon: '🧹' },
  { id: 'kueche', label: 'Küche', icon: '🍽️' },
  { id: 'wohnzimmer', label: 'Wohnzimmer', icon: '🛋️' },
  { id: 'schlafzimmer', label: 'Schlafzimmer', icon: '🛏️' },
  { id: 'badezimmer', label: 'Badezimmer', icon: '🛁' },
  { id: 'waesche', label: 'Wäsche', icon: '👕' },
  { id: 'muell', label: 'Müll', icon: '🗑️' },
  { id: 'einkaufen', label: 'Einkaufen', icon: '🛒' },
  { id: 'pflanzen', label: 'Pflanzen', icon: '🪴' },
  { id: 'haustiere', label: 'Haustiere', icon: '🐾' },
  { id: 'auto', label: 'Auto', icon: '🚗' },
]

export const DEFAULT_ROOM: ChoreRoom = 'allgemein'

const ROOM_BY_ID = new Map<ChoreRoom, RoomDef>(ROOMS.map((r) => [r.id, r]))

// Robust gegen Altbestand ohne room-Feld: fällt auf 'allgemein' zurück.
export function roomOf(chore: Chore): ChoreRoom {
  return chore.room && ROOM_BY_ID.has(chore.room) ? chore.room : DEFAULT_ROOM
}

export function roomDef(id: ChoreRoom): RoomDef {
  return ROOM_BY_ID.get(id) ?? ROOMS[0]
}

export function roomLabel(id: ChoreRoom): string {
  return roomDef(id).label
}

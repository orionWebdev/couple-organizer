import type { BucketListItem, Couple, IdeaCategory, IdeaCategoryDef } from '@/types'

export type { IdeaCategoryDef }

// Bisher festes 3er-Set, jetzt Default — bestehende BucketListItem.category-Werte
// bleiben ohne Migration gültig, weil die IDs dieselben bleiben.
export const DEFAULT_IDEA_CATEGORIES: readonly IdeaCategoryDef[] = [
  { id: 'film', emoji: '🎬', label: 'Filme & Serien' },
  { id: 'essen', emoji: '🍜', label: 'Essen gehen' },
  { id: 'date', emoji: '✨', label: 'Date-Ideen' },
] as const

// Auswahl für selbst angelegte Kategorien (IconGridPicker in den Settings).
export const IDEA_ICON_CHOICES: readonly string[] = [
  '🎬', '🍜', '✨', '🎡', '🏕️', '🎨', '🎵', '📚',
  '🏔️', '🏖️', '🚲', '🎳', '🍷', '🎁', '🐾', '💡',
]

// Die Collection ist älter als die Kategorien: Dokumente aus der Bucket-List
// tragen noch 'ort' oder 'restaurant'. Statt sie zu migrieren, werden sie beim
// Lesen abgebildet — 'restaurant' ist "Essen gehen", 'ort' eine Date-Idee. Greift
// nur, solange die jeweilige Default-Kategorie überhaupt noch existiert.
const LEGACY: Record<string, IdeaCategory> = {
  restaurant: 'essen',
  ort: 'date',
}

// Ideen einer gelöschten Kategorie behalten ihren Wert und werden hierüber
// angezeigt — sie tauchen dann nur noch unter "Alle" auf.
const ORPHAN: IdeaCategoryDef = { id: '', emoji: '💡', label: 'Ohne Kategorie' }

export function resolveIdeaCategories(couple: Couple | null): readonly IdeaCategoryDef[] {
  return couple?.ideaCategories ?? DEFAULT_IDEA_CATEGORIES
}

export function ideaCategory(raw: string, categories: readonly IdeaCategoryDef[]): IdeaCategory {
  if (categories.some((c) => c.id === raw)) return raw
  const legacy = LEGACY[raw]
  if (legacy && categories.some((c) => c.id === legacy)) return legacy
  return raw
}

export function categoryDef(raw: string, categories: readonly IdeaCategoryDef[]): IdeaCategoryDef {
  const id = ideaCategory(raw, categories)
  return categories.find((c) => c.id === id) ?? { ...ORPHAN, id: raw }
}

// Wer die Idee vorgeschlagen hat. Altbestand hat kein `suggestedBy` — dort ist
// der Ersteller die beste verfügbare Antwort.
export function ideaAuthor(item: BucketListItem): string {
  return item.suggestedBy || item.createdBy
}

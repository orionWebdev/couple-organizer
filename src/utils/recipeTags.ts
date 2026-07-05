// Feste Kategorien fürs Rezept-Wiki. IDs/Farben/Emojis 1:1 aus der Referenz
// (reference/Nido-source-code.dc.html, tagMeta) übernommen.
export type RecipeTagId =
  | 'quick'
  | 'onepot'
  | 'mealprep'
  | 'datenight'
  | 'veggie'
  | 'meat'
  | 'pasta'
  | 'fakeaway'

export interface RecipeTagDef {
  id: RecipeTagId
  emoji: string
  label: string
  color: string
}

export const RECIPE_TAGS: readonly RecipeTagDef[] = [
  { id: 'quick', emoji: '⏱️', label: 'Schnelle Nummer', color: 'oklch(0.78 0.13 80)' },
  { id: 'onepot', emoji: '🧺', label: 'One-Pot', color: 'oklch(0.70 0.13 150)' },
  { id: 'mealprep', emoji: '🔀', label: 'Meal Prep', color: 'oklch(0.66 0.12 255)' },
  { id: 'datenight', emoji: '🕯️', label: 'Date Night', color: 'oklch(0.64 0.14 312)' },
  { id: 'veggie', emoji: '🌱', label: 'Vegetarisch/Vegan', color: 'oklch(0.70 0.13 150)' },
  { id: 'meat', emoji: '🥩', label: 'Fleisch/Fisch', color: 'var(--food)' },
  { id: 'pasta', emoji: '🍝', label: 'Pasta-Liebe', color: 'oklch(0.78 0.13 80)' },
  { id: 'fakeaway', emoji: '🥡', label: 'Fakeaway', color: 'oklch(0.69 0.10 195)' },
]

const TAG_BY_ID = new Map<string, RecipeTagDef>(RECIPE_TAGS.map((t) => [t.id, t]))

export function recipeTagDef(id: string): RecipeTagDef | null {
  return TAG_BY_ID.get(id) ?? null
}

// Icon/Farbe der ersten bekannten Kategorie eines Rezepts, mit Fallback.
export function primaryTagMeta(tags: readonly string[]): { emoji: string; color: string } {
  for (const t of tags) {
    const def = recipeTagDef(t)
    if (def) return { emoji: def.emoji, color: def.color }
  }
  return { emoji: '🍽️', color: 'var(--food)' }
}

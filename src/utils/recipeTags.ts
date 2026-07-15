import type { Couple, RecipeCategoryDef } from '@/types'

export type { RecipeCategoryDef }

// Bisher festes 8er-Set (IDs/Farben/Emojis 1:1 aus der Referenz
// reference/Nido-source-code.dc.html, tagMeta), jetzt Default — bestehende
// Recipe.tags-Werte bleiben ohne Migration gültig, weil die IDs dieselben sind.
// Genau diese IDs stehen auch im Gemini-Schema (TAG_IDS in src/services/aiDirect.ts
// und functions/src/lib/gemini.ts): die KI kann nur aus ihnen wählen, selbst
// angelegte Kategorien vergibt man von Hand.
export const DEFAULT_RECIPE_CATEGORIES: readonly RecipeCategoryDef[] = [
  { id: 'quick', emoji: '⏱️', label: 'Schnelle Nummer', color: 'oklch(0.78 0.13 80)' },
  { id: 'onepot', emoji: '🧺', label: 'One-Pot', color: 'oklch(0.70 0.13 150)' },
  { id: 'mealprep', emoji: '🔀', label: 'Meal Prep', color: 'oklch(0.66 0.12 255)' },
  { id: 'datenight', emoji: '🕯️', label: 'Date Night', color: 'oklch(0.64 0.14 312)' },
  { id: 'veggie', emoji: '🌱', label: 'Vegetarisch/Vegan', color: 'oklch(0.70 0.13 150)' },
  { id: 'meat', emoji: '🥩', label: 'Fleisch/Fisch', color: 'var(--food)' },
  { id: 'pasta', emoji: '🍝', label: 'Pasta-Liebe', color: 'oklch(0.78 0.13 80)' },
  { id: 'fakeaway', emoji: '🥡', label: 'Fakeaway', color: 'oklch(0.69 0.10 195)' },
]

// Auswahl für selbst angelegte Kategorien (IconGridPicker in den Settings).
export const RECIPE_ICON_CHOICES: readonly string[] = [
  '⏱️', '🧺', '🔀', '🕯️', '🌱', '🥩', '🍝', '🥡',
  '🍲', '🥗', '🍛', '🌮', '🍜', '🥘', '🍰', '🥞',
]

// Neue Kategorien bekommen ihre Farbe beim Anlegen aus dieser Palette (das
// Formular lässt nur Name + Icon wählen, wie bei den Ausgaben-Kategorien).
const COLOR_PALETTE: readonly string[] = [
  'oklch(0.78 0.13 80)',
  'oklch(0.70 0.13 150)',
  'oklch(0.66 0.12 255)',
  'oklch(0.64 0.14 312)',
  'var(--food)',
  'oklch(0.69 0.10 195)',
  'var(--haushalt)',
  'var(--finanzen)',
]

export function nextRecipeCategoryColor(existingCount: number): string {
  return COLOR_PALETTE[existingCount % COLOR_PALETTE.length]
}

export function resolveRecipeCategories(couple: Couple | null): readonly RecipeCategoryDef[] {
  return couple?.recipeCategories ?? DEFAULT_RECIPE_CATEGORIES
}

export function recipeCategoryDef(
  id: string,
  categories: readonly RecipeCategoryDef[]
): RecipeCategoryDef | null {
  return categories.find((c) => c.id === id) ?? null
}

// Icon/Farbe der ersten bekannten Kategorie eines Rezepts, mit Fallback. Ein
// Rezept einer gelöschten Kategorie behält seinen Tag-Wert und fällt hier
// einfach auf das neutrale Besteck-Icon zurück.
export function primaryTagMeta(
  tags: readonly string[],
  categories: readonly RecipeCategoryDef[]
): { emoji: string; color: string } {
  for (const t of tags) {
    const def = recipeCategoryDef(t, categories)
    if (def) return { emoji: def.emoji, color: def.color }
  }
  return { emoji: '🍽️', color: 'var(--food)' }
}

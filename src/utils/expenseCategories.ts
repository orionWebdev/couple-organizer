import type { ExpenseCategoryDef } from '@/types'

// Bisheriges festes 5er-Set, jetzt als Default-Kategorien — bestehende
// Expense.category-Werte bleiben ohne Migration gültig.
export const DEFAULT_EXPENSE_CATEGORIES: readonly ExpenseCategoryDef[] = [
  { id: 'food', name: 'Lebensmittel', icon: '🛒' },
  { id: 'transport', name: 'Auto', icon: '🚗' },
  { id: 'home', name: 'Haushalt', icon: '🏠' },
  { id: 'leisure', name: 'Essen', icon: '🍽️' },
  { id: 'other', name: 'Sonstiges', icon: '📦' },
]

// 16 Icons aus der Settings-Referenz für neue, selbst angelegte Kategorien.
export const EXPENSE_CATEGORY_ICON_CHOICES: readonly string[] = [
  '🛒', '🍽️', '🏠', '⚡', '🚗', '🎉', '💊', '👕',
  '🎮', '📱', '🐾', '✈️', '🎬', '📚', '☕', '🎁',
]

// Rotierende Palette aus bestehenden App-Farbtokens statt einer freien
// Farbwahl im Formular (das Mockup lässt nur das Icon wählen).
const CATEGORY_COLOR_PALETTE: readonly string[] = [
  'var(--einkauf)',
  'oklch(0.66 0.12 255)',
  'var(--haushalt)',
  'oklch(0.64 0.14 312)',
  'var(--finanzen)',
  'oklch(0.70 0.13 150)',
  'oklch(0.55 0.18 25)',
  'oklch(0.78 0.13 80)',
]

export function categoryColor(categories: readonly ExpenseCategoryDef[], id: string): string {
  const idx = categories.findIndex((c) => c.id === id)
  if (idx === -1) return 'var(--text-faint)'
  return CATEGORY_COLOR_PALETTE[idx % CATEGORY_COLOR_PALETTE.length]
}

export function categoryMeta(categories: readonly ExpenseCategoryDef[], id: string): { name: string; icon: string; color: string } {
  const found = categories.find((c) => c.id === id)
  if (!found) return { name: 'Kategorie', icon: '📦', color: 'var(--text-faint)' }
  return { name: found.name, icon: found.icon, color: categoryColor(categories, id) }
}

export function resolveExpenseCategories(couple: { expenseCategories?: ExpenseCategoryDef[] } | null): readonly ExpenseCategoryDef[] {
  return couple?.expenseCategories ?? DEFAULT_EXPENSE_CATEGORIES
}

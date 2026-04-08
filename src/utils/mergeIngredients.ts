import type { RecipeIngredient } from '@/types'

// ---------------------------------------------------------------------------
// Unit conversion table
// Defines which units share a common base and their multiplication factor.
// Only units listed here are eligible for cross-unit merging (g + kg, ml + l).
// ---------------------------------------------------------------------------
const CONVERTIBLE_UNITS: Record<string, { base: string; factor: number }> = {
  g:  { base: 'g',  factor: 1     },
  kg: { base: 'g',  factor: 1000  },
  ml: { base: 'ml', factor: 1     },
  l:  { base: 'ml', factor: 1000  },
}

/**
 * Normalizes a German ingredient name for deduplication.
 *
 * - Lowercases and trims whitespace
 * - Strips trailing 'n' to collapse the most common German plural pattern:
 *   "Tomaten" → "tomate", "Zwiebeln" → "zwiebel", "Karotten" → "karotte"
 *
 * Intentionally conservative: only the 'n' rule is applied to avoid
 * false matches (e.g. "Ananas" must not be stripped).
 */
function normalizeName(name: string): string {
  const s = name.toLowerCase().trim()
  // Minimum length guard prevents mangling short words like "Öl" or "Ei"
  if (s.length >= 5 && s.endsWith('n')) return s.slice(0, -1)
  return s
}

/**
 * Converts an amount + unit into a canonical base amount for accumulation.
 * Unknown units are treated as their own base (no conversion).
 */
function toBaseAmount(
  amount: number,
  unit: string,
): { baseAmount: number; baseUnit: string } {
  const conversion = CONVERTIBLE_UNITS[unit.toLowerCase()]
  if (conversion) {
    return { baseAmount: amount * conversion.factor, baseUnit: conversion.base }
  }
  // Unknown unit: use lowercased unit as its own key so case variants still merge
  return { baseAmount: amount, baseUnit: unit.toLowerCase() }
}

/**
 * Converts a base amount back to a display-friendly unit.
 * Promotes g → kg and ml → l when the total reaches 1 000 or more.
 */
function fromBaseAmount(
  baseAmount: number,
  baseUnit: string,
): { amount: number; unit: string } {
  if (baseUnit === 'g' && baseAmount >= 1000) {
    return { amount: baseAmount / 1000, unit: 'kg' }
  }
  if (baseUnit === 'ml' && baseAmount >= 1000) {
    return { amount: baseAmount / 1000, unit: 'l' }
  }
  return { amount: baseAmount, unit: baseUnit }
}

// Internal accumulator entry — not exposed outside this module
interface MergeEntry {
  /** First-seen, human-readable ingredient name used in the final output. */
  displayName: string
  /** Running total in base unit (grams, millilitres, or the raw unit). */
  baseAmount: number
  /** Base unit key used to decide display promotion (e.g. 'g', 'ml'). */
  baseUnit: string
  /** Original unit string for custom/non-convertible units (preserves casing). */
  originalUnit: string
}

/**
 * Merges ingredients from multiple recipes into a single shopping list.
 *
 * Behaviour:
 * - Same ingredient name (after normalization) + same *compatible* unit → amounts are summed.
 * - g and kg are treated as compatible; ml and l are treated as compatible.
 * - Ingredients with differing non-convertible units (e.g. "TL" vs "EL") are kept separate.
 * - The original readable name is preserved from the first occurrence.
 * - The input is never mutated.
 *
 * @param recipes - Array of objects that each carry an `ingredients` list.
 * @returns Merged, deduplicated ingredient list ready for shopping.
 *
 * @example
 * mergeIngredients([
 *   { ingredients: [{ name: 'Tomaten', amount: 200, unit: 'g' }] },
 *   { ingredients: [{ name: 'Tomate',  amount: 0.5, unit: 'kg' }] },
 * ])
 * // → [{ name: 'Tomaten', amount: 700, unit: 'g' }]
 */
export function mergeIngredients(
  recipes: ReadonlyArray<{ ingredients: ReadonlyArray<RecipeIngredient> }>,
): RecipeIngredient[] {
  if (!recipes.length) return []

  // Key: "<normalizedName>|<baseUnit>"  →  accumulated data
  const accumulator = new Map<string, MergeEntry>()

  for (const recipe of recipes) {
    if (!recipe.ingredients?.length) continue

    for (const ingredient of recipe.ingredients) {
      const rawName = ingredient.name?.trim()
      if (!rawName) continue // skip entries with no name

      // Treat missing amount as 0 so the entry still appears in the output
      const amount = ingredient.amount ?? 0
      const unit = ingredient.unit?.trim() ?? ''

      const { baseAmount, baseUnit } = toBaseAmount(amount, unit)
      const key = `${normalizeName(rawName)}|${baseUnit}`

      const existing = accumulator.get(key)
      if (existing) {
        // Same ingredient, compatible unit → accumulate
        existing.baseAmount += baseAmount
      } else {
        // First occurrence — record the display name and unit as-is
        accumulator.set(key, {
          displayName: rawName,
          baseAmount,
          baseUnit,
          originalUnit: unit,
        })
      }
    }
  }

  // Convert each accumulated entry back to a human-readable ingredient
  return Array.from(accumulator.values()).map((entry) => {
    const isConvertible = Boolean(CONVERTIBLE_UNITS[entry.originalUnit.toLowerCase()])

    if (isConvertible) {
      // Let the auto-promotion logic decide the final unit (e.g. g → kg)
      const { amount, unit } = fromBaseAmount(entry.baseAmount, entry.baseUnit)
      return { name: entry.displayName, amount, unit }
    }

    // Custom unit (e.g. "Stück", "EL", "TL"): preserve original casing
    return {
      name: entry.displayName,
      amount: entry.baseAmount,
      unit: entry.originalUnit,
    }
  })
}

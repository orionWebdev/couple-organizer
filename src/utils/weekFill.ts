// Wochenplan aus dem eigenen Rezept-Wiki füllen — ohne einen einzigen
// KI-Aufruf.
//
// Der Hintergrund: Googles Free-Tier gibt dem Projekt nur 20 Gemini-Anfragen
// pro Tag, und der Wochenplan ist die teuerste und häufigste davon. Gleichzeitig
// füllt sich das Wiki durch die KI von selbst (jeder KI-Plan legt bis zu sieben
// Rezepte ab). Also übernimmt die Sammlung den Alltag, und die KI wird zum
// Nachfüller, wenn die Ideen ausgehen.
//
// Reine Funktion wie choreBalance.ts / belegung.ts — testbar ohne Firestore.
import type { MealPlanEntry, Recipe } from '@/types'

const AVOID_WINDOW_DAYS = 14

export interface LibraryPick {
  dateKey: string
  recipeId: string
}

function toDateKey(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${m}-${d}`
}

function primaryTag(recipe: Recipe): string {
  return recipe.tags?.[0] ?? ''
}

// Was zuletzt auf dem Plan stand, soll nicht sofort wiederkommen — dieselbe
// 14-Tage-Regel, die auch der KI als `avoidTitles` mitgegeben wird.
export function recentlyCookedIds(
  entries: readonly MealPlanEntry[],
  now = new Date()
): Set<string> {
  const cutoff = toDateKey(new Date(now.getTime() - AVOID_WINDOW_DAYS * 86400000))
  return new Set(entries.filter((e) => e.dateKey >= cutoff).map((e) => e.recipeId))
}

// Wie viele Tage ließen sich gerade füllen, ohne etwas zu wiederholen? Steuert
// die Beschriftung und den Deaktiviert-Zustand in der UI, damit der Knopf nicht
// etwas verspricht, was die Sammlung nicht hergibt.
export function libraryCapacity(
  recipes: readonly Recipe[],
  entries: readonly MealPlanEntry[],
  now = new Date()
): number {
  const recent = recentlyCookedIds(entries, now)
  return recipes.filter((r) => !recent.has(r.id)).length
}

export function pickWeekFromLibrary(opts: {
  recipes: readonly Recipe[]
  entries: readonly MealPlanEntry[]
  dateKeys: readonly string[]
  now?: Date
}): LibraryPick[] {
  const now = opts.now ?? new Date()
  const recent = recentlyCookedIds(opts.entries, now)

  // Gelikte zuerst, dann der Rest — und innerhalb beider Gruppen das am
  // längsten nicht Angefasste zuerst, damit die Sammlung durchrotiert statt
  // immer dieselben drei Lieblinge zu spielen.
  const rank = (r: Recipe) => (r.likes?.length ? 0 : 1)
  const fresh = opts.recipes.filter((r) => !recent.has(r.id)).sort((a, b) => rank(a) - rank(b))
  // Reicht die Sammlung nicht, dürfen kürzlich gekochte nachrücken — ein
  // gefüllter Tag ist besser als ein leerer.
  const fallback = opts.recipes.filter((r) => recent.has(r.id)).sort((a, b) => rank(a) - rank(b))

  const pool = [...fresh, ...fallback]
  const used = new Set<string>()
  const picks: LibraryPick[] = []
  let lastTag = ''

  for (const dateKey of opts.dateKeys) {
    const available = pool.filter((r) => !used.has(r.id))
    if (!available.length) break

    // Abwechslung: bevorzugt ein Gericht mit anderer Hauptkategorie als gestern.
    const varied = available.find((r) => primaryTag(r) !== lastTag)
    const chosen = varied ?? available[0]

    used.add(chosen.id)
    lastTag = primaryTag(chosen)
    picks.push({ dateKey, recipeId: chosen.id })
  }

  return picks
}

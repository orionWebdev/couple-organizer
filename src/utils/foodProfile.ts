// Dauerhafte Ess-Vorlieben des Paares (Couple.foodProfile). Gleiche Konvention
// wie die drei Kategorie-Listen: fehlendes Feld = Defaults, ein `resolve*`
// löst das für alle Aufrufer auf.
//
// Der Sinn: was hier steht, fließt in JEDEN Rezept-Aufruf ein (Einzelvorschlag
// wie Wochenplan). Vorher war der Einzelvorschlag der einzige KI-Aufruf der App
// ganz ohne Kontext — deshalb fühlte sich der eingetippte Wunsch wirkungslos an.
import type { Couple, FoodProfile } from '@/types'

export const DEFAULT_FOOD_PROFILE: FoodProfile = {
  servings: 2,
  likes: '',
  dislikes: '',
  diet: '',
  weekdayMaxMinutes: null
}

export function resolveFoodProfile(couple: Couple | null): FoodProfile {
  const raw = couple?.foodProfile
  if (!raw) return { ...DEFAULT_FOOD_PROFILE }
  // Feldweise auffüllen: ein Profil aus einer früheren Version kann einzelne
  // Felder nicht haben, und `servings: 0` wäre als Portionszahl unbrauchbar.
  return {
    servings: raw.servings > 0 ? raw.servings : DEFAULT_FOOD_PROFILE.servings,
    likes: raw.likes ?? '',
    dislikes: raw.dislikes ?? '',
    diet: raw.diet ?? '',
    weekdayMaxMinutes: raw.weekdayMaxMinutes ?? null
  }
}

// Trägt das Profil überhaupt etwas bei, das über den Default hinausgeht? Steuert
// den Hinweis "noch nichts hinterlegt" in der UI.
export function hasFoodProfileContent(profile: FoodProfile): boolean {
  return !!(
    profile.likes.trim() ||
    profile.dislikes.trim() ||
    profile.diet.trim() ||
    profile.weekdayMaxMinutes
  )
}

// Einzeilige Zusammenfassung für Settings-Zeile und Sheet-Hinweis.
export function foodProfileSummary(profile: FoodProfile): string {
  const parts: string[] = [`${profile.servings} Portionen`]
  if (profile.diet.trim()) parts.push(profile.diet.trim())
  if (profile.dislikes.trim()) parts.push(`ohne ${profile.dislikes.trim()}`)
  if (profile.likes.trim()) parts.push(profile.likes.trim())
  if (profile.weekdayMaxMinutes) parts.push(`werktags ≤ ${profile.weekdayMaxMinutes} Min`)
  return parts.join(' · ')
}

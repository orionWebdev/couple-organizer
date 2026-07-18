// Ersetzt die früheren Direct-Client-Calls (gemini.ts / geminiFinance.ts). Der
// Gemini-Key liegt jetzt serverseitig im Secret Manager; hier bleibt nur der
// Aufruf der Callables. Prompts und Response-Schemas sind nach
// functions/src/lib/gemini.ts gewandert.
import { httpsCallable, FunctionsError } from 'firebase/functions'
import { functions } from './firebase'

export interface RecipeIngredient {
  name: string
  amount?: number
  unit?: string
}

export interface RecipeNutrition {
  kcal: number
  protein: number
  carbs: number
  fat: number
}

export interface RecipeSuggestion {
  title: string
  description?: string
  minutes?: number
  servings?: number
  tags?: string[]
  ingredients: RecipeIngredient[]
  steps: string[]
  nutrition?: RecipeNutrition
}

export interface PlanWeekInput {
  count: number
  servings?: number | null
  prefs?: string
  avoidTitles?: string[]
  favorTitles?: string[]
}

export interface FinanceCategoryDelta {
  name: string
  currentEuros: number
  previousEuros: number
  deltaPct: number | null
}

export interface Quota {
  used: number
  limit: number
}

// Die beiden Gründe, aus denen ein KI-Aufruf abgelehnt wird, sind keine Fehler
// im eigentlichen Sinn — sie sollen eine Paywall öffnen, keinen Toast zeigen.
// Deshalb als Ergebnistyp statt als Exception.
export type AiResult<T> =
  | { kind: 'ok'; data: T; quota: Quota }
  | { kind: 'quota'; quota: Quota }
  | { kind: 'premium' }

interface QuotaDetails {
  used?: number
  limit?: number
}

function toAiResult<T>(err: unknown): AiResult<T> {
  const code = err instanceof FunctionsError ? err.code : null
  const details = (err instanceof FunctionsError ? err.details : null) as QuotaDetails | null

  if (code === 'functions/resource-exhausted') {
    return { kind: 'quota', quota: { used: details?.used ?? 0, limit: details?.limit ?? 0 } }
  }
  if (code === 'functions/failed-precondition') {
    return { kind: 'premium' }
  }
  // Alles andere (Netz, Gemini down, App Check) bleibt eine echte Exception und
  // landet im try/catch der Aufrufer.
  throw err
}

const callSuggestRecipes = httpsCallable<
  { coupleId: string; query: string; count: number },
  { recipes: RecipeSuggestion[]; quota: Quota }
>(functions, 'suggestRecipes')

const callPlanWeek = httpsCallable<
  { coupleId: string } & PlanWeekInput,
  { recipes: RecipeSuggestion[]; quota: Quota }
>(functions, 'planWeek')

const callSuggestFinanceInsight = httpsCallable<
  { coupleId: string; deltas: FinanceCategoryDelta[]; monthLabel: string },
  { insightText: string; quota: Quota }
>(functions, 'suggestFinanceInsight')

const callSyncEntitlement = httpsCallable<
  { coupleId: string },
  { plan: 'free' | 'premium'; premiumUntil: number | null }
>(functions, 'syncEntitlement')

// Solange die Cloud Functions nicht deployt sind (Blaze + Secrets + App Check),
// würde jeder KI-Aufruf ins Leere laufen. Bis dahin geht der Aufruf direkt an
// Gemini — so, wie die App es vor dem Functions-Umbau getan hat.
//
// ⚠️ Das gilt bewusst AUCH für den Produktions-Build (Vercel), nicht nur für
// `npm run dev`: der Key landet damit im öffentlichen JS-Bundle und ist dort
// auslesbar. Bewusst in Kauf genommen, bis die Functions live sind.
//
// Die Weiche ist allein die Env-Variable. Nach dem Deploy also:
// VITE_GEMINI_API_KEY in Vercel UND in .env.local entfernen → die App schaltet
// von selbst auf die Callables um, und src/services/aiDirect.ts kann weg.
const useDirect = !!import.meta.env.VITE_GEMINI_API_KEY

// Die Quote wird nur serverseitig geführt. Auf dem Direktweg gibt es keine —
// limit: 0 sorgt dafür, dass die UI gar keinen Zähler anzeigt.
const NO_QUOTA: Quota = { used: 0, limit: 0 }

export async function suggestRecipes(
  coupleId: string,
  query: string,
  count = 3
): Promise<AiResult<RecipeSuggestion[]>> {
  if (useDirect) {
    const { directSuggestRecipes } = await import('./aiDirect')
    return { kind: 'ok', data: await directSuggestRecipes(query, count), quota: NO_QUOTA }
  }

  try {
    const res = await callSuggestRecipes({ coupleId, query, count })
    return { kind: 'ok', data: res.data.recipes ?? [], quota: res.data.quota }
  } catch (err) {
    return toAiResult<RecipeSuggestion[]>(err)
  }
}

// Wochen-Autopilot: plant alle Kochtage in einem Aufruf. Quota-/Premium-
// Ablehnung kommt wie bei suggestRecipes als AiResult-Zweig zurück.
export async function planWeek(
  coupleId: string,
  input: PlanWeekInput
): Promise<AiResult<RecipeSuggestion[]>> {
  if (useDirect) {
    const { directPlanWeek } = await import('./aiDirect')
    return { kind: 'ok', data: await directPlanWeek(input), quota: NO_QUOTA }
  }

  try {
    const res = await callPlanWeek({ coupleId, ...input })
    return { kind: 'ok', data: res.data.recipes ?? [], quota: res.data.quota }
  } catch (err) {
    return toAiResult<RecipeSuggestion[]>(err)
  }
}

export async function suggestFinanceInsight(
  coupleId: string,
  deltas: FinanceCategoryDelta[],
  monthLabel: string
): Promise<AiResult<string>> {
  if (useDirect) {
    const { directSuggestFinanceInsight } = await import('./aiDirect')
    return { kind: 'ok', data: await directSuggestFinanceInsight(deltas, monthLabel), quota: NO_QUOTA }
  }

  try {
    const res = await callSuggestFinanceInsight({ coupleId, deltas, monthLabel })
    return { kind: 'ok', data: res.data.insightText, quota: res.data.quota }
  } catch (err) {
    return toAiResult<string>(err)
  }
}

// Holt den Abo-Status direkt bei RevenueCat ab und schreibt ihn aufs Couple-Doc.
// Nötig, weil der Webhook ein paar Sekunden brauchen kann — ohne das stünde der
// Nutzer nach dem Kauf kurz wieder vor der Paywall.
export async function syncEntitlement(coupleId: string): Promise<void> {
  await callSyncEntitlement({ coupleId })
}

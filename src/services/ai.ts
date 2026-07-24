// Ersetzt die früheren Direct-Client-Calls (gemini.ts / geminiFinance.ts). Der
// Gemini-Key liegt jetzt serverseitig im Secret Manager; hier bleibt nur der
// Aufruf der Callables. Prompts und Response-Schemas sind nach
// functions/src/lib/gemini.ts gewandert.
import { httpsCallable, FunctionsError } from 'firebase/functions'
import type { FoodProfile } from '@/types'
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

// Was die KI über das Paar wissen muss, damit ein Vorschlag nicht generisch
// wird. Gilt bewusst für BEIDE Rezept-Aufrufe: der Einzelvorschlag war lange
// der einzige KI-Aufruf der App ganz ohne Kontext — nur der eingetippte Satz —
// und fühlte sich deshalb wirkungslos an.
export interface RecipeContext {
  servings?: number | null
  prefs?: string // Freitext, gilt nur für diesen einen Lauf
  profile?: FoodProfile | null // dauerhaftes Ess-Profil vom Couple-Doc
  avoidTitles?: string[] // zuletzt gekocht → nicht schon wieder
  favorTitles?: string[] // gelikte Rezepte → dürfen wiederkommen
}

export type PlanWeekInput = RecipeContext & { count: number }

// ── Paar-Coach ───────────────────────────────────────────────────
// Ein Aufruf, drei Blickwinkel. `suggestion.action` ist der Punkt der ganzen
// Übung: sie verwandelt einen Text in einen Tap, und alle Ziele existieren in
// der App bereits (FairDistributeSheet, "Begleichen", Ideen, Budget-Sheet).
export type CoachLens = 'week' | 'fairness' | 'money'
export type CoachTone = 'good' | 'watch' | 'act'
export type CoachAction = 'rebalanceChores' | 'settleUp' | 'planIdea' | 'setBudget' | 'none'

// Was die KI liefert — nur noch WORTE. Die frühere `sections[]` (Prosa je
// Bereich) ist seit dem 3er-Umbau raus: die Zahlen kommen als `CoachMetric`
// aus dem Snapshot (siehe buildCoachMetrics), gerendert als Slider. Das trennt
// „Zahlen aus dem Code, Worte aus der KI" sauber — die KI kann keine Zahl mehr
// halluzinieren, und der Text schrumpft auf headline + Vorschlag + Gesprächssatz.
export interface CoachReport {
  headline: string
  suggestion: { text: string; action: CoachAction }
  talkingPoint: string
}

// Eine gemessene Kennzahl als Slider. Wird NICHT von der KI erzeugt, sondern
// clientseitig aus dem Snapshot gerechnet und mit dem Bericht gespeichert.
export interface CoachMetric {
  key: string
  label: string      // "Last", "Geld", "Zwischen euch"
  value: string      // "58 zu 42", "640 € von 800 €"
  leftEnd: string    // Slider-Ende links
  rightEnd: string   // Slider-Ende rechts
  pct: number        // 0..100 — Position des Thumbs
  tone: CoachTone
}

export interface Quota {
  used: number
  limit: number
}

// Kein Aufruf wirft an den Client. Jeder Ausgang ist ein eigener Zweig:
//   'quota' / 'premium' → Paywall öffnen, kein Fehler im eigentlichen Sinn
//   'error'             → echter Fehlschlag, der auch so gesagt werden muss
//
// 'error' gibt es, weil ein Fehlschlag vorher als leeres Ergebnis durchgereicht
// wurde: aus "Gemini ist ausgelastet" wurde im Wochenplan ein "Kein Tag mehr
// übrig". Ein Fehler darf nie wie ein leeres Ergebnis aussehen.
export type AiResult<T> =
  | { kind: 'ok'; data: T; quota: Quota }
  | { kind: 'quota'; quota: Quota }
  | { kind: 'premium' }
  | { kind: 'error'; message: string; retryable: boolean }

interface QuotaDetails {
  used?: number
  limit?: number
}

// Googles Free-Tier kennt ZWEI verschiedene 429er, und sie bedeuten das
// Gegenteil voneinander:
//   Minutenlimit  → gleich noch einmal probieren
//   Tageslimit    → heute ist Schluss (20 Anfragen/Tag fürs ganze Projekt,
//                   quotaId GenerateRequestsPerDayPerProjectPerModel-FreeTier)
// Beides gleich zu behandeln schickt den Nutzer in eine Wartezeit, die nichts
// ändert. Weg damit ist einzig Billing auf dem Google-Projekt.
const DAILY_LIMIT =
  'Das Tageskontingent der KI ist aufgebraucht (20 Anfragen/Tag im kostenlosen Google-Kontingent). Morgen geht es wieder.'
const RATE_LIMITED = 'Die KI ist gerade ausgelastet. Probier es in einer Minute noch einmal.'
const UNAVAILABLE = 'Die KI ist gerade nicht erreichbar. Bitte später erneut versuchen.'

interface GeminiError {
  status?: number
  dailyQuota?: boolean
}

function rateLimitKind(err: unknown): 'daily' | 'burst' | null {
  const e = err as GeminiError | null
  const message = String((err as Error)?.message ?? '')
  const code = err instanceof FunctionsError ? err.code : null

  const is429 =
    e?.status === 429 ||
    (code === 'functions/unavailable' && /429|ausgelastet|Tageskontingent/i.test(message))
  if (!is429) return null

  return e?.dailyQuota || /Tageskontingent|PerDay/i.test(message) ? 'daily' : 'burst'
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

  console.error('AI call failed:', err)
  const limit = rateLimitKind(err)
  if (limit === 'daily') return { kind: 'error', message: DAILY_LIMIT, retryable: false }
  if (limit === 'burst') return { kind: 'error', message: RATE_LIMITED, retryable: true }
  return { kind: 'error', message: UNAVAILABLE, retryable: false }
}

const callSuggestRecipes = httpsCallable<
  { coupleId: string; query: string; count: number } & RecipeContext,
  { recipes: RecipeSuggestion[]; quota: Quota }
>(functions, 'suggestRecipes')

const callPlanWeek = httpsCallable<
  { coupleId: string } & PlanWeekInput,
  { recipes: RecipeSuggestion[]; quota: Quota }
>(functions, 'planWeek')

const callCoachInsight = httpsCallable<
  { coupleId: string; lens: CoachLens; snapshot: unknown },
  { report: CoachReport; quota: Quota }
>(functions, 'coachInsight')

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
  count = 3,
  ctx: RecipeContext = {}
): Promise<AiResult<RecipeSuggestion[]>> {
  try {
    if (useDirect) {
      const { directSuggestRecipes } = await import('./aiDirect')
      return { kind: 'ok', data: await directSuggestRecipes(query, count, ctx), quota: NO_QUOTA }
    }
    const res = await callSuggestRecipes({ coupleId, query, count, ...ctx })
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
  try {
    if (useDirect) {
      const { directPlanWeek } = await import('./aiDirect')
      return { kind: 'ok', data: await directPlanWeek(input), quota: NO_QUOTA }
    }
    const res = await callPlanWeek({ coupleId, ...input })
    return { kind: 'ok', data: res.data.recipes ?? [], quota: res.data.quota }
  } catch (err) {
    return toAiResult<RecipeSuggestion[]>(err)
  }
}

export async function coachInsight(
  coupleId: string,
  lens: CoachLens,
  snapshot: unknown
): Promise<AiResult<CoachReport>> {
  try {
    if (useDirect) {
      const { directCoachInsight } = await import('./aiDirect')
      return { kind: 'ok', data: await directCoachInsight(lens, snapshot), quota: NO_QUOTA }
    }
    const res = await callCoachInsight({ coupleId, lens, snapshot })
    return { kind: 'ok', data: res.data.report, quota: res.data.quota }
  } catch (err) {
    return toAiResult<CoachReport>(err)
  }
}

// Holt den Abo-Status direkt bei RevenueCat ab und schreibt ihn aufs Couple-Doc.
// Nötig, weil der Webhook ein paar Sekunden brauchen kann — ohne das stünde der
// Nutzer nach dem Kauf kurz wieder vor der Paywall.
export async function syncEntitlement(coupleId: string): Promise<void> {
  await callSyncEntitlement({ coupleId })
}

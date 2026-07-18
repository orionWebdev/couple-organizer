import { HttpsError } from 'firebase-functions/v2/https'
import { GEMINI_API_KEY } from './config'

// Der Key lebt ab hier ausschließlich serverseitig (Secret Manager). Im Client
// gab es ihn im Bundle, geschützt nur durch eine HTTP-Referrer-Sperre — die im
// Capacitor-WebView (Origin https://localhost) nicht mehr greift.
const MODEL = 'gemini-2.5-flash'
const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models'

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

export interface FinanceCategoryDelta {
  name: string
  currentEuros: number
  previousEuros: number
  deltaPct: number | null
}

// Vokabular der Rezept-Wiki-Kategorien (src/utils/recipeTags.ts) — Gemini
// bekommt die IDs vorgegeben, damit Vorschläge zu den Filter-Badges passen.
const TAG_IDS = ['quick', 'onepot', 'mealprep', 'datenight', 'veggie', 'meat', 'pasta', 'fakeaway']

const RECIPE_RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    recipes: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          title: { type: 'STRING' },
          description: { type: 'STRING' },
          minutes: { type: 'INTEGER' },
          servings: { type: 'INTEGER' },
          tags: { type: 'ARRAY', items: { type: 'STRING', enum: TAG_IDS } },
          ingredients: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                name: { type: 'STRING' },
                amount: { type: 'NUMBER' },
                unit: { type: 'STRING' }
              },
              required: ['name']
            }
          },
          steps: { type: 'ARRAY', items: { type: 'STRING' } },
          nutrition: {
            type: 'OBJECT',
            nullable: true,
            properties: {
              kcal: { type: 'INTEGER' },
              protein: { type: 'INTEGER' },
              carbs: { type: 'INTEGER' },
              fat: { type: 'INTEGER' }
            },
            required: ['kcal', 'protein', 'carbs', 'fat']
          }
        },
        required: ['title', 'ingredients', 'steps']
      }
    }
  },
  required: ['recipes']
}

const INSIGHT_RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    insightText: { type: 'STRING' }
  },
  required: ['insightText']
}

async function callGemini(prompt: string, schema: object): Promise<string> {
  const res = await fetch(`${API_BASE}/${MODEL}:generateContent?key=${GEMINI_API_KEY.value()}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: schema
      }
    })
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    // Der Client sieht bewusst keine Gemini-Interna — die landen nur im Log.
    console.error(`Gemini ${res.status}: ${body}`)
    throw new HttpsError('unavailable', 'Die KI ist gerade nicht erreichbar. Bitte später erneut versuchen.')
  }

  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[]
  }
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) {
    throw new HttpsError('unavailable', 'Die KI hat keine Antwort geliefert.')
  }
  return text
}

export async function generateRecipes(query: string, count: number): Promise<RecipeSuggestion[]> {
  const prompt = `Du bist ein Kochassistent für ein Paar, das seinen Wochen-Essensplan erstellt.
Schlage genau ${count} Rezept(e) vor, die zu folgendem Wunsch passen: "${query}".
Nutze nur haushaltsübliche Zutaten und gib realistische Kochzeiten und Portionsangaben an.
Gib nummerierte, knappe Zubereitungsschritte an (steps).
Ordne jedem Rezept 1-3 passende Kategorien aus dieser Liste zu: ${TAG_IDS.join(', ')}.
Schätze Nährwerte pro Portion (nutrition) nur, wenn du dir einigermaßen sicher bist — sonst lass das Feld weg.`

  const text = await callGemini(prompt, RECIPE_RESPONSE_SCHEMA)
  const parsed = JSON.parse(text) as { recipes?: RecipeSuggestion[] }
  return parsed.recipes ?? []
}

export interface WeekPlanInput {
  count: number
  servings?: number | null
  prefs?: string
  avoidTitles?: string[]
  favorTitles?: string[]
}

// Wochen-Autopilot: EIN Aufruf plant die ganzen Kochtage als zusammenhängendes
// Set (Abwechslung statt N unabhängiger Vorschläge). Nutzt dasselbe
// Recipe-Schema — die Antwort ist wieder { recipes: [...] }, nur in der
// gewünschten Reihenfolge und Anzahl.
export async function generateWeekPlan(input: WeekPlanInput): Promise<RecipeSuggestion[]> {
  const favor = (input.favorTitles ?? []).filter(Boolean)
  const avoid = (input.avoidTitles ?? []).filter(Boolean)

  const prompt = `Du bist ein Kochassistent für ein Paar und planst dessen Abendessen für die Woche.
Erstelle GENAU ${input.count} Abendessen als zusammenhängenden Wochenplan.
Wichtig: die Gerichte sollen abwechslungsreich sein (nicht mehrmals dasselbe Grundgericht, wechselnde Hauptzutaten und Küchenstile über die Woche).
${input.servings ? `Plane für ${input.servings} Portionen pro Gericht.` : 'Plane für 2 Portionen pro Gericht.'}
${input.prefs?.trim() ? `Berücksichtige diese Vorlieben und No-Gos des Paares: "${input.prefs.trim()}".` : ''}
${favor.length ? `Das Paar mag diese Gerichte besonders — du DARFST 1-2 davon wieder einplanen (dann exakt denselben Titel verwenden), musst aber nicht: ${favor.join(', ')}.` : ''}
${avoid.length ? `Diese Gerichte gab es kürzlich schon — plane sie NICHT erneut: ${avoid.join(', ')}.` : ''}
Nutze haushaltsübliche Zutaten, gib realistische Kochzeiten und Portionsangaben an und knappe, nummerierte Zubereitungsschritte (steps).
Ordne jedem Rezept 1-3 passende Kategorien aus dieser Liste zu: ${TAG_IDS.join(', ')}.
Schätze Nährwerte pro Portion (nutrition) nur, wenn du dir einigermaßen sicher bist — sonst lass das Feld weg.
Gib die Rezepte in der Reihenfolge zurück, in der sie über die Woche gekocht werden sollen.`

  const text = await callGemini(prompt, RECIPE_RESPONSE_SCHEMA)
  const parsed = JSON.parse(text) as { recipes?: RecipeSuggestion[] }
  return parsed.recipes ?? []
}

export async function generateFinanceInsight(
  deltas: FinanceCategoryDelta[],
  monthLabel: string
): Promise<string> {
  const factsText = deltas
    .map((d) => {
      const deltaText =
        d.deltaPct === null ? 'neu diesen Monat' : `${d.deltaPct > 0 ? '+' : ''}${d.deltaPct}% ggü. Vormonat`
      return `- ${d.name}: ${d.currentEuros.toFixed(2)} € (${deltaText}, Vormonat ${d.previousEuros.toFixed(2)} €)`
    })
    .join('\n')

  const prompt = `Du bist ein neutraler, freundlicher Finanz-Coach für ein Paar, das seine Ausgaben gemeinsam verwaltet.
Hier sind die Ausgaben nach Kategorie für ${monthLabel} im Vergleich zum Vormonat:
${factsText || '(keine Ausgaben in diesem oder dem letzten Monat)'}

Schreibe GENAU EINEN kurzen, konkreten Satz (max. 220 Zeichen) auf Deutsch, der die auffälligste Veränderung neutral benennt
(nimm dabei keine Wertung wie "schlecht" vor) und ggf. einen sanften, konkreten Alltagstipp andeutet.
Erfinde KEINE Zahlen, die nicht oben stehen. Wenn es keine nennenswerte Veränderung gibt, sag das kurz und positiv.`

  const text = await callGemini(prompt, INSIGHT_RESPONSE_SCHEMA)
  const parsed = JSON.parse(text) as { insightText?: string }
  if (!parsed.insightText) {
    throw new HttpsError('unavailable', 'Die KI hat keinen Insight geliefert.')
  }
  return parsed.insightText
}

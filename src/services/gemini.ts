// Direct client -> Gemini call, secured via an HTTP-referrer-restricted API
// key (see .env.example) rather than a server-side proxy — consistent with
// this app's "no custom backend" architecture (see firebase.ts).
//
// This is the ONE place that knows how recipe suggestions are fetched. If the
// app later ships as a native Play Store wrapper that doesn't preserve the
// origin's Referer header (e.g. Capacitor's capacitor://localhost, unlike a
// TWA which keeps serving the real HTTPS origin), the referrer restriction
// stops protecting the key — at that point, swap the fetch() below for a
// call to a small Firebase Cloud Function that holds the key server-side.
// Callers of suggestRecipes() don't need to change either way.

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

// Vokabular der Rezept-Wiki-Kategorien (src/utils/recipeTags.ts) — Gemini
// bekommt die IDs vorgegeben, damit Vorschläge zu den Filter-Badges passen.
const TAG_IDS = ['quick', 'onepot', 'mealprep', 'datenight', 'veggie', 'meat', 'pasta', 'fakeaway']

// Controlled generation: Gemini returns JSON matching this shape directly,
// no free-text parsing needed.
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
                unit: { type: 'STRING' },
              },
              required: ['name'],
            },
          },
          steps: { type: 'ARRAY', items: { type: 'STRING' } },
          nutrition: {
            type: 'OBJECT',
            nullable: true,
            properties: {
              kcal: { type: 'INTEGER' },
              protein: { type: 'INTEGER' },
              carbs: { type: 'INTEGER' },
              fat: { type: 'INTEGER' },
            },
            required: ['kcal', 'protein', 'carbs', 'fat'],
          },
        },
        required: ['title', 'ingredients', 'steps'],
      },
    },
  },
  required: ['recipes'],
}

// Wirft bei fehlendem Key, HTTP-Fehlern oder unbrauchbarer Antwort — der
// Aufrufer (künftige useMealPlan-Composable) fängt das analog zu den anderen
// use*.ts-Composables ab und meldet es per Toast.
export async function suggestRecipes(query: string, count = 3): Promise<RecipeSuggestion[]> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('VITE_GEMINI_API_KEY ist nicht gesetzt (.env.local prüfen, siehe .env.example).')
  }

  const prompt = `Du bist ein Kochassistent für ein Paar, das seinen Wochen-Essensplan erstellt.
Schlage genau ${count} Rezept(e) vor, die zu folgendem Wunsch passen: "${query}".
Nutze nur haushaltsübliche Zutaten und gib realistische Kochzeiten und Portionsangaben an.
Gib nummerierte, knappe Zubereitungsschritte an (steps).
Ordne jedem Rezept 1-3 passende Kategorien aus dieser Liste zu: ${TAG_IDS.join(', ')}.
Schätze Nährwerte pro Portion (nutrition) nur, wenn du dir einigermaßen sicher bist — sonst lass das Feld weg.`

  const res = await fetch(`${API_BASE}/${MODEL}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: RECIPE_RESPONSE_SCHEMA,
      },
    }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Gemini-Anfrage fehlgeschlagen (${res.status}): ${body}`)
  }

  const data = await res.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) {
    throw new Error('Gemini hat keine Rezeptvorschläge geliefert.')
  }

  const parsed = JSON.parse(text) as { recipes?: RecipeSuggestion[] }
  return parsed.recipes ?? []
}

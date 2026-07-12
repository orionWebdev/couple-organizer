// Übergangslösung. Ruft Gemini direkt aus dem Browser auf, mit dem Key aus
// VITE_GEMINI_API_KEY — genau das, was die App vor dem Cloud-Functions-Umbau
// getan hat.
//
// Existiert, weil die Functions noch nicht deployt sind (Blaze + Secrets + App
// Check fehlen) und die App bis dahin trotzdem benutzbar bleiben soll — auch im
// Vercel-Build, nicht nur im `npm run dev`.
//
// ⚠️ Der Key liegt damit im öffentlichen JS-Bundle und ist auslesbar. Das ist
// eine bewusste, temporäre Entscheidung. Ins offene Netz gehört dieser Build nur
// mit einem Key, dessen Missbrauch verkraftbar ist — idealerweise per
// HTTP-Referrer auf die eigene Domain eingeschränkt.
//
// Sobald die Functions deployt sind: VITE_GEMINI_API_KEY überall entfernen
// (Vercel + .env.local), dann greift die Weiche in ai.ts nicht mehr und diese
// Datei kann ersatzlos weg.
import type { FinanceCategoryDelta, RecipeSuggestion } from './ai'

const MODEL = 'gemini-2.5-flash'
const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models'

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
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('VITE_GEMINI_API_KEY ist nicht gesetzt (lokal: .env.local, deployt: Vercel-Env-Vars).')
  }

  const res = await fetch(`${API_BASE}/${MODEL}:generateContent?key=${apiKey}`, {
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
    throw new Error(`Gemini-Anfrage fehlgeschlagen (${res.status}): ${body}`)
  }

  const data = await res.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error('Gemini hat keine Antwort geliefert.')
  return text
}

export async function directSuggestRecipes(query: string, count: number): Promise<RecipeSuggestion[]> {
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

export async function directSuggestFinanceInsight(
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
  if (!parsed.insightText) throw new Error('Gemini hat keinen Insight geliefert.')
  return parsed.insightText
}

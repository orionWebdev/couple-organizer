// Eigene Datei statt Erweiterung von gemini.ts, damit dessen Doku zur
// alleinigen Zuständigkeit für Rezeptvorschläge nicht vermischt wird — gleiches
// Direct-Client-Call-Muster (siehe gemini.ts) mit demselben referrer-restricted Key.

const MODEL = 'gemini-2.5-flash'
const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models'

export interface FinanceCategoryDelta {
  name: string
  currentEuros: number
  previousEuros: number
  deltaPct: number | null
}

const INSIGHT_RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    insightText: { type: 'STRING' }
  },
  required: ['insightText']
}

// Die Zahlen werden clientseitig berechnet und hier nur noch in natürliche
// Sprache gefasst — Gemini bekommt sie fest vorgegeben, damit der Text nicht
// mit erfundenen Werten halluziniert.
export async function suggestFinanceInsight(deltas: FinanceCategoryDelta[], monthLabel: string): Promise<string> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('VITE_GEMINI_API_KEY ist nicht gesetzt (.env.local prüfen, siehe .env.example).')
  }

  const factsText = deltas
    .map((d) => {
      const deltaText = d.deltaPct === null ? 'neu diesen Monat' : `${d.deltaPct > 0 ? '+' : ''}${d.deltaPct}% ggü. Vormonat`
      return `- ${d.name}: ${d.currentEuros.toFixed(2)} € (${deltaText}, Vormonat ${d.previousEuros.toFixed(2)} €)`
    })
    .join('\n')

  const prompt = `Du bist ein neutraler, freundlicher Finanz-Coach für ein Paar, das seine Ausgaben gemeinsam verwaltet.
Hier sind die Ausgaben nach Kategorie für ${monthLabel} im Vergleich zum Vormonat:
${factsText || '(keine Ausgaben in diesem oder dem letzten Monat)'}

Schreibe GENAU EINEN kurzen, konkreten Satz (max. 220 Zeichen) auf Deutsch, der die auffälligste Veränderung neutral benennt
(nimm dabei keine Wertung wie "schlecht" vor) und ggf. einen sanften, konkreten Alltagstipp andeutet.
Erfinde KEINE Zahlen, die nicht oben stehen. Wenn es keine nennenswerte Veränderung gibt, sag das kurz und positiv.`

  const res = await fetch(`${API_BASE}/${MODEL}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: INSIGHT_RESPONSE_SCHEMA
      }
    })
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Gemini-Anfrage fehlgeschlagen (${res.status}): ${body}`)
  }

  const data = await res.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) {
    throw new Error('Gemini hat keinen Insight geliefert.')
  }

  const parsed = JSON.parse(text) as { insightText?: string }
  if (!parsed.insightText) {
    throw new Error('Gemini hat keinen Insight geliefert.')
  }
  return parsed.insightText
}

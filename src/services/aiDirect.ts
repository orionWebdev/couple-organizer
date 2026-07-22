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
import type { CoachLens, CoachReport, PlanWeekInput, RecipeContext, RecipeSuggestion } from './ai'

const MODEL = 'gemini-2.5-flash'
// Eigene Konstante, weil der Coach ein anderer Auftrag ist als Rezepte: er
// urteilt über eine strukturierte Faktenlage und läuft höchstens wöchentlich —
// ein größeres Modell wäre hier bezahlbar.
//
// Steht trotzdem auf Flash: `gemini-2.5-pro` ist im **Free-Tier gar nicht
// nutzbar** (API antwortet mit 429 und "limit: 0"), und der aktuelle Key hat
// kein Billing. Sobald Blaze/Billing steht, ist das hier die eine Zeile, die
// sich ändert — dann bitte gegen die echte Faktenlage gegenprüfen.
const COACH_MODEL = 'gemini-2.5-flash'
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

// ── Paar-Coach ───────────────────────────────────────────────────
// Schema und Prompt müssen identisch zu functions/src/lib/gemini.ts bleiben.
const SECTION_IDS = ['fairness', 'money', 'together']
const TONES = ['good', 'watch', 'act']
const ACTIONS = ['rebalanceChores', 'settleUp', 'planIdea', 'setBudget', 'none']

const COACH_RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    headline: { type: 'STRING' },
    sections: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          id: { type: 'STRING', enum: SECTION_IDS },
          title: { type: 'STRING' },
          text: { type: 'STRING' },
          tone: { type: 'STRING', enum: TONES }
        },
        required: ['id', 'title', 'text', 'tone']
      }
    },
    suggestion: {
      type: 'OBJECT',
      properties: {
        text: { type: 'STRING' },
        action: { type: 'STRING', enum: ACTIONS }
      },
      required: ['text', 'action']
    },
    talkingPoint: { type: 'STRING' }
  },
  required: ['headline', 'sections', 'suggestion', 'talkingPoint']
}

async function callGemini(prompt: string, schema: object, model = MODEL): Promise<string> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('VITE_GEMINI_API_KEY ist nicht gesetzt (lokal: .env.local, deployt: Vercel-Env-Vars).')
  }

  const res = await fetch(`${API_BASE}/${model}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: schema,
        // Ein Wochenplan sind sieben Rezepte mit Zutaten, Schritten und
        // Nährwerten — plus die Denk-Tokens von 2.5-flash, die mitzählen. Ohne
        // ausreichend Budget bricht die Antwort mittendrin ab und das JSON ist
        // unparsbar. Explizit gesetzt, statt sich auf den Default zu verlassen.
        maxOutputTokens: 32768
      }
    })
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    // Status und Art des Limits mitgeben. Das Google-Free-Tier hat ZWEI
    // verschiedene 429er: ein kurzes Minutenlimit (gleich nochmal probieren)
    // und ein Tageskontingent (heute ist Schluss). Wer die verwechselt,
    // schickt den Nutzer in eine Minute, die nichts ändert.
    const err = Object.assign(new Error(`Gemini-Anfrage fehlgeschlagen (${res.status}): ${body}`), {
      status: res.status,
      dailyQuota: /PerDay|RequestsPerDay/i.test(body)
    })
    throw err
  }

  const data = await res.json()
  const candidate = data.candidates?.[0]
  const text = candidate?.content?.parts?.[0]?.text

  // Abgeschnittene Antwort: das JSON wäre unparsbar und der Aufrufer sähe nur
  // einen kryptischen Syntaxfehler. Lieber klar benennen.
  if (candidate?.finishReason === 'MAX_TOKENS') {
    throw new Error('Die Antwort wurde abgeschnitten. Versuch es mit weniger Tagen auf einmal.')
  }
  if (!text) {
    throw new Error(`Gemini hat keine Antwort geliefert (finishReason=${candidate?.finishReason ?? 'unbekannt'}).`)
  }
  return text
}

// Kontext-Block für BEIDE Rezept-Prompts. Muss identisch zu contextBlock() in
// functions/src/lib/gemini.ts bleiben.
function contextBlock(ctx: RecipeContext): string {
  const p = ctx.profile
  const favor = (ctx.favorTitles ?? []).filter(Boolean)
  const avoid = (ctx.avoidTitles ?? []).filter(Boolean)
  const lines: string[] = []

  lines.push(`- Portionen pro Gericht: ${ctx.servings ?? p?.servings ?? 2}`)
  if (p?.diet?.trim()) lines.push(`- Ernährungsform: ${p.diet.trim()}`)
  if (p?.dislikes?.trim()) lines.push(`- Kommt gar nicht in Frage: ${p.dislikes.trim()}`)
  if (p?.likes?.trim()) lines.push(`- Mag das Paar besonders: ${p.likes.trim()}`)
  if (p?.weekdayMaxMinutes) lines.push(`- Werktags höchstens ${p.weekdayMaxMinutes} Minuten Kochzeit`)
  if (ctx.prefs?.trim()) lines.push(`- Zusätzlich für diesen Vorschlag: ${ctx.prefs.trim()}`)
  if (favor.length) {
    lines.push(`- Beliebte Gerichte des Paares (dürfen wiederkommen, dann exakt derselbe Titel): ${favor.join(', ')}`)
  }
  if (avoid.length) {
    lines.push(`- Gab es in den letzten zwei Wochen schon, NICHT erneut vorschlagen: ${avoid.join(', ')}`)
  }

  return lines.join('\n')
}

// Formatregeln stehen bewusst UNTEN und der Wunsch/Auftrag oben: vorher ging der
// eigentliche Nutzerwunsch zwischen fünf generischen Auflagen unter.
const FORMAT_RULES = `- Nutze haushaltsübliche Zutaten und gib realistische Kochzeiten und Portionsangaben an.
- Gib knappe, nummerierte Zubereitungsschritte an (steps).
- Ordne jedem Rezept 1-3 passende Kategorien aus dieser Liste zu: ${TAG_IDS.join(', ')}.
- Schätze Nährwerte pro Portion (nutrition) nur, wenn du dir einigermaßen sicher bist — sonst lass das Feld weg.`

// Ernährungsform und No-Gos sind hart; alles andere darf der aktuelle Wunsch
// überstimmen — sonst könnte man das Profil nie punktuell übergehen.
const PRECEDENCE_RULE = `Ernährungsform und No-Gos gelten IMMER. Widerspricht der Wunsch dem Profil sonst irgendwo, hat der Wunsch Vorrang.`

export async function directSuggestRecipes(
  query: string,
  count: number,
  ctx: RecipeContext = {}
): Promise<RecipeSuggestion[]> {
  const prompt = `Du bist ein Kochassistent für ein Paar, das seinen Essensplan erstellt.

WUNSCH FÜR DIESEN VORSCHLAG:
"${query}"

Schlage genau ${count} Rezept(e) vor, die diesen Wunsch erfüllen. Die Vorschläge sollen sich deutlich voneinander unterscheiden, damit es etwas zu entscheiden gibt.

DAS PAAR:
${contextBlock(ctx)}

${PRECEDENCE_RULE}

FORMAT:
${FORMAT_RULES}`

  const text = await callGemini(prompt, RECIPE_RESPONSE_SCHEMA)
  const parsed = JSON.parse(text) as { recipes?: RecipeSuggestion[] }
  return parsed.recipes ?? []
}

export async function directPlanWeek(input: PlanWeekInput): Promise<RecipeSuggestion[]> {
  const prompt = `Du bist ein Kochassistent für ein Paar und planst dessen Abendessen für die Woche.

AUFTRAG:
Erstelle GENAU ${input.count} Abendessen als zusammenhängenden Wochenplan. Die Gerichte sollen abwechslungsreich sein — nicht mehrmals dasselbe Grundgericht, wechselnde Hauptzutaten und Küchenstile über die Woche.

DAS PAAR:
${contextBlock(input)}

${PRECEDENCE_RULE}

FORMAT:
${FORMAT_RULES}
- Gib die Rezepte in der Reihenfolge zurück, in der sie über die Woche gekocht werden sollen.`

  const text = await callGemini(prompt, RECIPE_RESPONSE_SCHEMA)
  const parsed = JSON.parse(text) as { recipes?: RecipeSuggestion[] }
  return parsed.recipes ?? []
}

const LENS_TASK: Record<CoachLens, string> = {
  week: `Schreibe das Wochen-Check-in des Paares. Nimm jeden Abschnitt auf, zu dem die Daten etwas hergeben (fairness, money, together) — höchstens drei.`,
  fairness: `Schau NUR auf die Aufgabenverteilung im Haushalt. Gib genau einen Abschnitt mit der id "fairness" zurück.`,
  money: `Schau NUR auf die Finanzen. Gib genau einen Abschnitt mit der id "money" zurück.`
}

// Der Grund, warum dieses Feature überhaupt existiert. Ohne diese Priorität
// greift das Modell zur naheliegendsten Zahl (Budget überzogen, Kategorie
// gestiegen) — also zu dem, was jede Haushaltsapp auch sagen kann. Interessant
// ist, was ZWISCHEN den beiden steht.
const PRIORITY_RULE = `WAS ZUERST ZÄHLT:
Das Unsichtbare wiegt schwerer als das Sichtbare, und was zwischen den beiden steht, schwerer als die reine Höhe. Prüfe in dieser Reihenfolge und nimm den ersten Punkt, der wirklich auffällt:
1. Mental Load — trägt einer den größeren Teil des MITDENKENS (mentalLoad.sharePct)? Das ist die Arbeit, die sonst niemand sieht, und deshalb der wichtigste Punkt überhaupt.
2. Eine ungleiche Aufgabenlast bei der Ausführung (fairness).
3. Ein schiefer Paar-Split beim Geld — einer legt dauerhaft deutlich mehr aus (money.paidBy.sharePct).
4. Ein offener Ausgleich, der schon länger steht (openBalanceEuros zusammen mit oldestOpenDays).
5. Dass lange nichts Gemeinsames anstand (together).
6. Erst danach: Budget, einzelne Kategorien, Ausgabenhöhe.
Ist unter 1.–5. nichts auffällig, ist Punkt 6 völlig in Ordnung — dann aber ohne Alarmton.

WERTSCHÄTZUNG IST TEIL DER AUFGABE:
Wenn einer deutlich mehr mitdenkt, benenne KONKRET, was er oder sie getragen hat (die Zahlen in mentalLoad) — und zwar so, dass der andere es als Leistung erkennt. Nicht "Sarah macht mehr", sondern was genau sie im Kopf behalten hat. Unsichtbare Arbeit sichtbar zu machen ist wertvoller als jeder Verbesserungsvorschlag.`

// Ohne diese drei Zeilen liest das Modell Felder falsch — es machte aus
// "78 % der Punkte" ein "78 % der Aufgaben" (Punkte sind gewichtet, das ist
// nicht dasselbe) und würde beglichene Ausgaben für nicht ausgegeben halten.
const GLOSSARY = `WAS DIE FELDER BEDEUTEN:
- mentalLoad misst, wer MITDENKT — wer merkt, dass etwas ansteht, und es einträgt. Das ist NICHT dasselbe wie fairness (wer es dann erledigt). Jemand kann viel ausführen und trotzdem wenig mitdenken, und umgekehrt.
- mentalLoad.calendarKeptForPartner zählt Termine, die jemand für den ANDEREN eingetragen hat — den Kalender des Partners im Kopf zu behalten ist die unsichtbarste Arbeit von allen.
- mentalLoad.shoppingNoticed ist die Zahl der Artikel; jemand hat also bemerkt, dass sie ausgehen, bevor sie fehlten.
- fairness.load[].points sind GEWICHTETE Aufwandspunkte, nicht die Anzahl erledigter Aufgaben. Sprich also von "der Aufgabenlast" oder "der Punkte" — niemals von "78 % der Aufgaben".
- money.paidBy sagt, wer ausgelegt hat. Das ist unabhängig davon, ob die beiden sich untereinander schon ausgeglichen haben.
- money.openBalanceEuros ist das, was noch ZWISCHEN den beiden offen steht — kein Schuldenstand gegenüber Dritten und kein Maß dafür, wie viel ausgegeben wurde.`

// Diese Regeln sind der eigentliche Wert des Features. Ein Coach, der in einer
// Beziehungs-App jemandem die Schuld zuweist, richtet Schaden an — deshalb steht
// die Ton-Regel hier so explizit.
const COACH_RULES = `REGELN — halte dich strikt daran:
1. Nutze AUSSCHLIESSLICH Zahlen und Fakten aus dem JSON oben. Erfinde nichts, rechne nichts hoch, was nicht dasteht. Steht ein Wert auf null, existiert er nicht — erwähne ihn dann gar nicht.
2. Stelle NIE einen der beiden ins Unrecht. Eine ungleiche Verteilung ist eine Frage der Last, nicht des Charakters. Sprich immer beide an ("ihr"), nie einen von beiden vorwurfsvoll ("du machst zu wenig").
3. "headline": EIN Satz, der den wichtigsten Befund BENENNT. Kein Etikett, keine Überschrift — "Eure Finanzen im Blick" oder "Wochenrückblick" ist wertlos, "Sarah hat diesen Monat drei Viertel ausgelegt" ist richtig.
4. Jeder Abschnitt: höchstens 2 Sätze. Konkret statt allgemein — nenne die Zahl, die den Punkt trägt. "title" sind zwei bis drei Wörter und wiederholen NICHT die headline.
5. "talkingPoint": GENAU EIN Satz in der ICH-Form, den einer der beiden dem anderen sagen kann — das ist die EINZIGE Ausnahme von Regel 2, hier also bewusst nicht "ihr". Als Einladung formuliert, nie als Vorwurf oder Forderung. Der Ton (nicht der Inhalt) soll so klingen: "Mir ist aufgefallen, dass ich gerade viel vorstrecke — wollen wir das mal zusammen anschauen?"
6. Ist die Lage unauffällig, sag das ruhig und positiv und setze tone "good". Suche dir kein Problem, nur damit du etwas zu sagen hast.
7. "suggestion.action" nur setzen, wenn sie zur Lage passt — sonst "none":
   - "settleUp": es steht ein offener Ausgleich zwischen euch (openBalanceEuros > 0), besonders wenn er schon alt ist.
   - "rebalanceChores": die Aufgabenlast liegt deutlich schief.
   - "planIdea": es stand lange nichts Gemeinsames an.
   - "setBudget": es gibt kein Monatsbudget (budgetEuros ist null) und die Ausgaben legen eins nahe.
   "suggestion.text" beschreibt in einem Satz, was der Tap bewirkt.
8. Deutsch, warm, erwachsen. Keine Emojis, keine Ausrufezeichen, kein Coaching-Jargon.
9. Beträge im deutschen Format mit Euro-Zeichen: 1.042,37 €. Prozent ohne Nachkommastellen: 72 %. Zeitspannen in Wochen, wenn es über 14 Tage sind.`

export async function directCoachInsight(lens: CoachLens, snapshot: unknown): Promise<CoachReport> {
  const prompt = `Du bist ein ruhiger, neutraler Begleiter für ein Paar, das seinen gemeinsamen Alltag in einer App organisiert. Du hilfst den beiden, fair und entspannt miteinander zu haushalten — nicht, mehr zu leisten.

DATEN (die einzige Grundlage deiner Aussagen):
${JSON.stringify(snapshot)}

${GLOSSARY}

AUFGABE:
${LENS_TASK[lens]}

${PRIORITY_RULE}

${COACH_RULES}`

  const text = await callGemini(prompt, COACH_RESPONSE_SCHEMA, COACH_MODEL)
  const parsed = JSON.parse(text) as CoachReport
  if (!parsed?.headline) throw new Error('Gemini hat keine Auswertung geliefert.')
  return parsed
}

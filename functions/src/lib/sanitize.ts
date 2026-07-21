// Alles hier kommt aus dem Client und landet ungefiltert im Prompt-Text. Ohne
// Typ- und Längengrenzen ließe sich beliebiger Text in den Prompt schmuggeln —
// deshalb wird jedes Feld einzeln geklemmt statt durchgereicht.
import type { FoodProfile, RecipeContext } from './gemini'

const MAX_TITLES = 20
const MAX_TITLE_LEN = 80
const MAX_FREETEXT = 300

export function cleanText(raw: unknown, max = MAX_FREETEXT): string {
  return String(raw ?? '').trim().slice(0, max)
}

export function cleanTitles(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((t) => String(t).trim().slice(0, MAX_TITLE_LEN))
    .filter(Boolean)
    .slice(0, MAX_TITLES)
}

function sanitizeFoodProfile(raw: unknown): FoodProfile | null {
  if (!raw || typeof raw !== 'object') return null
  const p = raw as Record<string, unknown>
  const minutes = Number(p.weekdayMaxMinutes)
  return {
    servings: Math.min(12, Math.max(1, Number(p.servings) || 2)),
    likes: cleanText(p.likes, 200),
    dislikes: cleanText(p.dislikes, 200),
    diet: cleanText(p.diet, 100),
    weekdayMaxMinutes: minutes > 0 ? Math.min(240, Math.round(minutes)) : null
  }
}

// Der Coach-Snapshot ist ein verschachteltes Objekt aus reinen Zahlen, kurzen
// Namen und Labels. Statt jedes Feld einzeln nachzubauen (und bei jeder
// Erweiterung des Snapshots hier nachzuziehen) wird die Struktur generisch
// geklemmt: Strings gekürzt, Zahlen erzwungen, Tiefe und Größe begrenzt.
const MAX_SNAPSHOT_DEPTH = 6
const MAX_ARRAY_ITEMS = 25
const MAX_OBJECT_KEYS = 40
const MAX_SNAPSHOT_CHARS = 12000

function clampValue(value: unknown, depth: number): unknown {
  if (value === null || value === undefined) return null
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') return value.slice(0, 120)
  if (depth >= MAX_SNAPSHOT_DEPTH) return null

  if (Array.isArray(value)) {
    return value.slice(0, MAX_ARRAY_ITEMS).map((v) => clampValue(v, depth + 1))
  }
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>).slice(0, MAX_OBJECT_KEYS)) {
      out[k.slice(0, 40)] = clampValue(v, depth + 1)
    }
    return out
  }
  return null
}

export function clampSnapshot(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const clamped = clampValue(raw, 0) as Record<string, unknown>
  if (!clamped || !Object.keys(clamped).length) return null
  // Letzte Reißleine gegen aufgeblähte Prompts.
  if (JSON.stringify(clamped).length > MAX_SNAPSHOT_CHARS) return null
  return clamped
}

export function sanitizeRecipeContext(raw: unknown): RecipeContext {
  const d = (raw ?? {}) as Record<string, unknown>
  return {
    servings: d.servings == null ? null : Math.min(12, Math.max(1, Number(d.servings) || 2)),
    prefs: cleanText(d.prefs),
    profile: sanitizeFoodProfile(d.profile),
    avoidTitles: cleanTitles(d.avoidTitles),
    favorTitles: cleanTitles(d.favorTitles)
  }
}

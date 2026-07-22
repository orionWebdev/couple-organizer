// Anzeige-Metadaten und reine Verdichtungslogik fürs Check-in — kein Firestore,
// keine KI (Muster wie rooms.ts / ideen.ts).
import type { CheckinArea, CheckinDigest, CheckinLevel } from '@/types'

export interface CheckinAreaDef {
  id: CheckinArea
  label: string
  emoji: string
}

// Bewusst nur vier grobe Bereiche: sie sind das Einzige, was den Snapshot in
// Richtung Partner/KI verlässt — je gröber, desto weniger ist zuzuordnen.
export const CHECKIN_AREAS: readonly CheckinAreaDef[] = [
  { id: 'haushalt', label: 'Haushalt', emoji: '🧽' },
  { id: 'finanzen', label: 'Finanzen', emoji: '💶' },
  { id: 'zeit', label: 'Zeit zu zweit', emoji: '🕰️' },
  { id: 'anerkennung', label: 'Anerkennung', emoji: '💛' }
]

export function checkinAreaDef(id: CheckinArea): CheckinAreaDef {
  return CHECKIN_AREAS.find((a) => a.id === id) ?? CHECKIN_AREAS[0]
}

// Keine Diagnose-Sprache — "beschäftigt mich" statt Intensitäts-Jargon.
export const CHECKIN_LEVEL_LABELS: Record<CheckinLevel, string> = {
  1: 'Beschäftigt mich etwas',
  2: 'Beschäftigt mich öfter',
  3: 'Belastet mich gerade'
}

// Ein anonymes Thema für den Coach-Snapshot: KEIN Autor, KEINE Pro-Kopf-Zahlen.
// Die Anti-Attribution beginnt hier, nicht erst im Prompt — was keinen Namen
// trägt, KANN die KI nicht zuordnen.
export interface CheckinTopic {
  area: CheckinArea
  mentions: number
  level: CheckinLevel
}

// Beide Digests (einer je Partner) zu einer gemischten Themenliste verdichten.
// mentions = Summe beider Seiten, level = das Maximum — mehr weiß danach niemand.
export function mergeDigestsToTopics(digests: readonly (CheckinDigest | null)[]): CheckinTopic[] {
  const byArea = new Map<CheckinArea, CheckinTopic>()
  for (const digest of digests) {
    if (!digest) continue
    for (const [area, info] of Object.entries(digest.areas ?? {})) {
      if (!info || info.count <= 0) continue
      const key = area as CheckinArea
      const prev = byArea.get(key)
      byArea.set(key, {
        area: key,
        mentions: (prev?.mentions ?? 0) + info.count,
        level: prev && prev.level >= info.maxLevel ? prev.level : info.maxLevel
      })
    }
  }
  return [...byArea.values()].sort((a, b) => b.level - a.level || b.mentions - a.mentions)
}

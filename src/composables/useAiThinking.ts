import { ref, readonly } from 'vue'

// Schlanker KI-Denk-Koordinator. Der Denk-Zustand selbst lebt jetzt IN-CONTEXT
// (das auslösende Sheet glüht, bzw. die Ziel-Karte im Finanz-Coach) — es gibt
// keine schwebenden Indikatoren (Rand-Glow/Denk-Leiste) mehr. Global bleibt nur
// der kurze Vollbild-Bloom als „Fertig"-Flourish vor einem Ergebnis; die
// einzelnen Flächen steuern ihren eigenen Glow über ein lokales `thinking`.
//
// - runTask(): führt die KI-Arbeit aus und wartet zugleich eine minimale
//   Denkdauer ab, damit die Animation nicht springt. Fehler → null.
// - playBloom(): spielt den Vollbild-Bloom (~480 ms) und löst danach auf.
//   Der AiThinkingHost rendert ihn aus `bloomActive`.
// reduced-motion: keine Mindestdauer, kein Bloom — direkt aufs Ergebnis.

const BLOOM_MS = 480
const DEFAULT_MIN_THINK_MS = 900

const bloomActive = ref(false)

function prefersReduced(): boolean {
  return typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
}

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

async function runTask<T>(task: () => Promise<T | null>, minThinkMs = DEFAULT_MIN_THINK_MS): Promise<T | null> {
  const safe = (async () => {
    try {
      return await task()
    } catch (err) {
      console.error('AI task failed:', err)
      return null
    }
  })()

  const [result] = await Promise.all([safe, delay(prefersReduced() ? 0 : minThinkMs)])
  return result
}

async function playBloom(): Promise<void> {
  if (prefersReduced()) return
  bloomActive.value = true
  await delay(BLOOM_MS)
  bloomActive.value = false
}

export function useAiThinking() {
  return {
    bloomActive: readonly(bloomActive),
    runTask,
    playBloom,
  }
}

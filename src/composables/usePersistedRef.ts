import { getCurrentScope, onScopeDispose, ref, watch, type Ref } from 'vue'

// Android verwirft die WebView (installierte PWA wie Capacitor-App) bei
// Speicherdruck; beim Zurückkehren gibt es einen Kaltstart und der In-Memory-
// State von Vue ist weg — Eingaben im Feld, der gerade offene Sheet, die
// gewählte Unteransicht. Das Reload lässt sich nicht zuverlässig verhindern,
// also spiegeln wir den flüchtigen Zustand nach localStorage und holen ihn beim
// nächsten Start zurück. Wie useTheme: localStorage (überlebt den Kaltstart,
// anders als sessionStorage), jeder Zugriff in try/catch (Safari-Privatmodus,
// blockierte Cookies) — ein Storage-Fehler darf nie den App-Start kosten.

const PREFIX = 'twodo:s:'
const DEBOUNCE_MS = 300

/**
 * Standard-Lebensdauer für flüchtige Entwürfe und offene Sheets/Detailansichten:
 * bei Rückkehr innerhalb weniger Stunden ist alles noch da, Tage später gibt es
 * einen sauberen Start. Navigations-Auswahl (Tab) läuft bewusst ohne TTL.
 */
export const DRAFT_TTL_MS = 6 * 60 * 60 * 1000

// Alle lebenden Persisted-Refs, damit ein einziger visibilitychange/pagehide-
// Handler sie beim Wegblenden sofort flushen kann — das ist das Sicherheitsnetz
// gegen einen harten Kill, bevor der Debounce-Timer feuert.
const flushers = new Set<() => void>()
let lifecycleBound = false

function bindLifecycle() {
  if (lifecycleBound || typeof document === 'undefined') return
  lifecycleBound = true
  const flushAll = () => {
    for (const flush of flushers) flush()
  }
  // visibilitychange (hidden) feuert im Android-WebView zuverlässig beim
  // Backgrounden; pagehide deckt den Web-Fall (Tab-Discard/Navigation) ab.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) flushAll()
  })
  window.addEventListener('pagehide', flushAll)
}

type Stored<T> = { v: T; t: number }

function read<T>(key: string, ttlMs?: number): { hit: true; value: T } | { hit: false } {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    if (raw === null) return { hit: false }
    const parsed = JSON.parse(raw) as Stored<T>
    if (!parsed || typeof parsed.t !== 'number') return { hit: false }
    if (ttlMs !== undefined && Date.now() - parsed.t > ttlMs) {
      localStorage.removeItem(PREFIX + key)
      return { hit: false }
    }
    return { hit: true, value: parsed.v }
  } catch {
    return { hit: false }
  }
}

function write<T>(key: string, value: T) {
  try {
    const payload: Stored<T> = { v: value, t: Date.now() }
    localStorage.setItem(PREFIX + key, JSON.stringify(payload))
  } catch {
    // Nicht persistierbar: der Wert gilt trotzdem für diese Sitzung.
  }
}

export interface PersistedRefOptions {
  /**
   * Lebensdauer des gespeicherten Werts. Beim Hydrieren wird ein älterer Wert
   * verworfen. Für Entwürfe / offene Sheets sinnvoll (Stunden), damit man Tage
   * später einen sauberen Start bekommt statt eines wieder aufpoppenden Sheets.
   * Ohne Angabe bleibt der Wert unbegrenzt gültig — passend für reine
   * Navigations-Auswahl (welcher Tab), deren Wiederherstellung harmlos ist.
   */
  ttlMs?: number
}

/**
 * Wie `ref()`, aber der Wert wird nach localStorage gespiegelt und beim nächsten
 * App-Start (auch nach einem Kaltstart) wieder hydriert. Schreibt debounced bei
 * Änderung und wird zusätzlich beim Wegblenden der App sofort geflusht.
 */
export function usePersistedRef<T>(
  key: string,
  initial: T,
  options: PersistedRefOptions = {}
): Ref<T> {
  const { ttlMs } = options
  const hydrated = read<T>(key, ttlMs)
  const state = ref<T>(hydrated.hit ? hydrated.value : initial) as Ref<T>

  let timer: ReturnType<typeof setTimeout> | null = null
  const flush = () => {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
    write(key, state.value)
  }

  watch(
    state,
    () => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(flush, DEBOUNCE_MS)
    },
    { deep: true }
  )

  flushers.add(flush)
  bindLifecycle()

  // Beim Unmount (z.B. ein Sheet, das schließt) den letzten Stand sichern und
  // den Flusher wieder abmelden — sonst wüchse das Set unbegrenzt.
  if (getCurrentScope()) {
    onScopeDispose(() => {
      flush()
      flushers.delete(flush)
    })
  }

  return state
}

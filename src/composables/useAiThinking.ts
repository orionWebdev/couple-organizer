import { ref, computed, readonly } from 'vue'

// Singleton-Denk-Zustand der TwoDo-KI — wie useToast/usePaywall genau einmal
// da, bespielt von einem einzigen AiThinkingHost (in TabsView). Der Screen
// bleibt beim „Denken" sichtbar; der animierte Gradient lebt nur noch inline
// (Rand-Glow bzw. Denk-Leiste) plus ein kurzer Vollbild-Bloom vorm Ergebnis.
//
// Ablauf einer Aktion: run() setzt step='thinking', zeigt je nach Task-Länge
// den Rand-Glow (kurze Task — die Grund-Signatur) oder die Denk-Leiste (lange
// Task, wo Fortschritt/ETA/Abbrechen zählen), lädt die echte KI-Antwort und
// wartet zugleich eine minimale Denkdauer ab, damit die Animation nicht
// springt. Danach kurzer Bloom (step='done') und Auflösung mit dem Ergebnis.
// null vom Task (Quota/Premium/Fehler) oder Abbrechen → idle.
//
// Hinweis: Der Rand-Glow ist bewusst NICHT mehr an `display-mode: standalone`
// gebunden — er ist die sichtbare KI-Signatur, auch im Browser-Tab. `position:
// fixed` liegt im Viewport (unter der URL-Leiste), kollidiert also nicht mit
// dem Browser-Chrome.

export type ThinkStep = 'idle' | 'thinking' | 'done'
export type ThinkMode = 'edge' | 'dock'

export interface AiRunOptions<T> {
  status: string // Titel/Status ("TwoDo KI plant …")
  subtitle?: string // Dock-Untertitel-Präfix ("7 Abendessen") — ETA wird angehängt
  short?: boolean // kurze Task → Rand-Glow-fähig (nur standalone)
  estMs?: number // geschätzte Dauer für Fortschritt/ETA (Dock)
  task: () => Promise<T | null> // die echte KI-Arbeit; null = Abbruch (Paywall/Fehler)
}

const MIN_THINK_MS = 900
const BLOOM_MS = 480
const PROGRESS_CAP = 0.92 // vor echter Antwort nie „100 %" behaupten

const step = ref<ThinkStep>('idle')
const mode = ref<ThinkMode>('dock')
const status = ref('')
const subtitle = ref<string | undefined>(undefined)
const etaSeconds = ref<number | null>(null)
const progress = ref(0) // 0..1, treibt dockFill

const busy = computed(() => step.value !== 'idle')

let runToken = 0
let cancelled = false
let progressTimer: ReturnType<typeof setInterval> | null = null

function prefersReduced(): boolean {
  return typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
}

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

function stopProgress() {
  if (progressTimer) {
    clearInterval(progressTimer)
    progressTimer = null
  }
}

function startProgress(estMs: number) {
  stopProgress()
  const start = Date.now()
  const tick = () => {
    const elapsed = Date.now() - start
    progress.value = Math.min(PROGRESS_CAP, elapsed / estMs)
    if (mode.value === 'dock') {
      // Bis zur echten Antwort nie unter 1 fallen (nie „0/negativ").
      etaSeconds.value = Math.max(1, Math.ceil((estMs - elapsed) / 1000))
    }
  }
  tick()
  progressTimer = setInterval(tick, 200)
}

function reset() {
  stopProgress()
  step.value = 'idle'
  etaSeconds.value = null
  progress.value = 0
  subtitle.value = undefined
}

// Vom Abbrechen-Button der Denk-Leiste. Der laufende Netz-Call lässt sich nicht
// wirklich stoppen, aber sein Ergebnis wird über den Token verworfen und die UI
// kehrt sofort in den Ruhezustand zurück.
function cancel() {
  cancelled = true
  runToken++
  reset()
}

async function safeTask<T>(task: () => Promise<T | null>): Promise<T | null> {
  try {
    return await task()
  } catch (err) {
    console.error('AI task failed:', err)
    return null
  }
}

async function run<T>(opts: AiRunOptions<T>): Promise<T | null> {
  const token = ++runToken
  cancelled = false

  const short = !!opts.short
  const estMs = opts.estMs ?? (short ? 6000 : 12000)

  status.value = opts.status
  subtitle.value = opts.subtitle
  // Kurze Task → Rand-Glow (Grund-Signatur), lange Task → Denk-Leiste.
  mode.value = short ? 'edge' : 'dock'
  progress.value = 0
  etaSeconds.value = mode.value === 'dock' ? Math.max(1, Math.ceil(estMs / 1000)) : null
  step.value = 'thinking'
  startProgress(estMs)

  const reduce = prefersReduced()
  const [result] = await Promise.all([
    safeTask(opts.task),
    delay(reduce ? 0 : MIN_THINK_MS),
  ])

  // Zwischenzeitlich abgebrochen oder von einem neuen run() abgelöst.
  if (token !== runToken || cancelled) return null

  stopProgress()

  if (result === null) {
    reset()
    return null
  }

  // Erfolg: Fortschritt vollenden.
  progress.value = 1
  etaSeconds.value = mode.value === 'dock' ? 0 : null

  // Reduced Motion: kein Bloom — direkt aufs Ergebnis.
  if (reduce) {
    reset()
    return result
  }

  step.value = 'done' // Vollbild-Bloom (~480 ms)
  await delay(BLOOM_MS)
  if (token !== runToken) return null

  reset()
  return result
}

export function useAiThinking() {
  return {
    step: readonly(step),
    mode: readonly(mode),
    status: readonly(status),
    subtitle: readonly(subtitle),
    etaSeconds: readonly(etaSeconds),
    progress: readonly(progress),
    busy,
    run,
    cancel,
  }
}

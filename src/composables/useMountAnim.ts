import { ref, watch, onScopeDispose, type Ref } from 'vue'

// Mount-Animationen der Glance-Karten (Ring füllt sich, Zahlen zählen hoch,
// Balken/Punkte wachsen). Bei `prefers-reduced-motion: reduce` gibt es keine
// Zwischenzustände — der Endzustand steht sofort.
export function prefersReducedMotion(): boolean {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
}

// Wird kurz nach dem ersten Render true. Erst dadurch springen CSS-Transitions
// von ihrem Startwert (Breite 0, Ring leer) auf den Zielwert — ohne die
// Verzögerung sähe der Browser beides im selben Frame und animierte gar nicht.
export function useMountFlag(delay = 60): Ref<boolean> {
  const on = ref(false)

  if (prefersReducedMotion()) {
    on.value = true
    return on
  }

  const id = setTimeout(() => { on.value = true }, delay)
  onScopeDispose(() => clearTimeout(id))

  return on
}

// Zählt von 0 auf `target` hoch, sobald `run` true ist (cubic ease-out).
// Ändert sich das Ziel später (neuer Firestore-Snapshot), läuft es vom aktuellen
// Wert dorthin, statt wieder bei 0 anzufangen.
export function useCountUp(target: Ref<number>, run: Ref<boolean>, duration = 900): Ref<number> {
  const value = ref(prefersReducedMotion() ? target.value : 0)
  let raf: number | null = null

  function stop() {
    if (raf !== null) cancelAnimationFrame(raf)
    raf = null
  }

  function animate() {
    stop()
    if (!run.value) return
    if (prefersReducedMotion()) {
      value.value = target.value
      return
    }

    const from = value.value
    const to = target.value
    const start = performance.now()

    const step = (now: number) => {
      const p = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - p, 3)
      value.value = from + (to - from) * eased
      if (p < 1) raf = requestAnimationFrame(step)
      else raf = null
    }
    raf = requestAnimationFrame(step)
  }

  watch([run, target], animate, { immediate: true })
  onScopeDispose(stop)

  return value
}

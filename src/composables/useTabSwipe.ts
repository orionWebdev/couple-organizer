import type { Ref } from 'vue'

interface TabSwipeOptions {
  /** Swipe wird ignoriert, solange das hier false liefert (z. B. Detail-Ansicht offen). */
  enabled?: () => boolean
}

/**
 * Horizontaler Swipe zwischen Tabs.
 *
 * Der Gestenverlauf wird über `touchmove` mitgeschrieben und nicht erst in
 * `touchend` ausgewertet: Sobald ein Touch in einem inneren Scroll-Container
 * (`overflow-y: auto`) startet, liefert WebKit statt `touchend` ein
 * `touchcancel`, wenn es die Geste dem Scroller zuschlägt. Wer nur auf
 * `touchend` hört, verliert den Swipe genau dort — deshalb werden beide Enden
 * gleich behandelt und die letzte bekannte Position aus `touchmove` genutzt.
 *
 * Elemente mit `data-hswipe-skip` (horizontale Chip-/Monats-Reihen) starten
 * keinen Tab-Wechsel.
 */
export function useTabSwipe<T extends string>(
  tabOrder: readonly T[],
  tab: Ref<T>,
  options: TabSwipeOptions = {},
) {
  const MIN_DISTANCE = 60
  const HORIZONTAL_RATIO = 1.7

  let startX = 0
  let startY = 0
  let lastX = 0
  let lastY = 0
  let ignore = true

  function goTab(dir: 1 | -1) {
    const next = tabOrder.indexOf(tab.value) + dir
    if (next < 0 || next >= tabOrder.length) return
    tab.value = tabOrder[next]
  }

  function onTouchStart(e: TouchEvent) {
    const t = e.touches[0]
    if (!t) return
    startX = lastX = t.clientX
    startY = lastY = t.clientY
    ignore =
      options.enabled?.() === false ||
      !!(e.target as HTMLElement | null)?.closest?.('[data-hswipe-skip]')
  }

  function onTouchMove(e: TouchEvent) {
    const t = e.touches[0]
    if (!t) return
    lastX = t.clientX
    lastY = t.clientY
  }

  function onTouchEnd(e: TouchEvent) {
    if (ignore) return
    ignore = true

    const t = e.changedTouches[0]
    const endX = t ? t.clientX : lastX
    const endY = t ? t.clientY : lastY
    const dx = endX - startX
    const dy = endY - startY

    if (Math.abs(dx) > MIN_DISTANCE && Math.abs(dx) > Math.abs(dy) * HORIZONTAL_RATIO) {
      goTab(dx < 0 ? 1 : -1)
    }
  }

  return { goTab, onTouchStart, onTouchMove, onTouchEnd }
}

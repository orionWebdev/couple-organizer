import { ref, readonly } from 'vue'

// Singleton wie useToast/usePaywall: der EINE globale FAB im App-Shell (TabsView)
// zeigt und triggert die Add-Aktion, die die gerade aktive View für ihren
// Unter-Tab anmeldet. So bleibt genau ein FAB statt eines pro Screen, ohne
// globalen Store.
//
// Ablauf pro View: ein `computed` bildet Tab/Unter-Tab → FabAction | null ab,
// ein `watch(..., { immediate: true })` schiebt es hier rein, und
// `onScopeDispose(() => setFabAction(null))` räumt beim Verlassen auf. Weil
// TabsViews <RouterView> KEINE Transition hat, mountet die neue View erst nach
// dem Unmount der alten — die Aufräum-/Setz-Reihenfolge ist damit rennfrei.
export interface FabAction {
  label: string
  handler: () => void
}

const action = ref<FabAction | null>(null)

export function setFabAction(next: FabAction | null) {
  action.value = next
}

export function useFabState() {
  return { action: readonly(action) }
}

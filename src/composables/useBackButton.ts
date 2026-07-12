import { watch, onScopeDispose, type Ref } from 'vue'
import { showToast } from './useToast'

// Stapel offener Overlays. Die Android-Zurück-Taste bedient immer das oberste
// zuerst — erst wenn keins mehr offen ist, wird navigiert.
type BackHandler = () => void

const stack: BackHandler[] = []

export function pushBackHandler(fn: BackHandler) {
  stack.push(fn)
}

export function popBackHandler(fn: BackHandler) {
  const idx = stack.lastIndexOf(fn)
  if (idx !== -1) stack.splice(idx, 1)
}

// Von BottomSheet.vue aus einmal aufgerufen — damit bekommt JEDES Sheet der App
// (Einladung, Ausgabe, Aufgabe, Buchung, Rezept, Paywall …) korrektes
// Back-to-Dismiss, ohne dass eine einzige View davon weiß.
export function useBackDismiss(isOpen: Ref<boolean> | (() => boolean), close: () => void) {
  const handler: BackHandler = () => close()

  watch(
    typeof isOpen === 'function' ? isOpen : () => isOpen.value,
    (open) => {
      if (open) pushBackHandler(handler)
      else popBackHandler(handler)
    },
    { immediate: true }
  )

  // Ein Sheet, das mit offenem Zustand unmountet, würde sonst einen toten
  // Handler im Stapel hinterlassen.
  onScopeDispose(() => popBackHandler(handler))
}

let lastBackPress = 0
const EXIT_WINDOW_MS = 2000

export interface BackButtonDeps {
  isRoot: () => boolean
  goBack: () => void
  exitApp: () => void
}

export function handleBackButton({ isRoot, goBack, exitApp }: BackButtonDeps) {
  const top = stack[stack.length - 1]
  if (top) {
    top()
    return
  }

  if (!isRoot()) {
    goBack()
    return
  }

  // Auf dem Dashboard: nicht beim ersten Druck rauswerfen.
  const now = Date.now()
  if (now - lastBackPress < EXIT_WINDOW_MS) {
    exitApp()
    return
  }
  lastBackPress = now
  showToast('Nochmal drücken zum Beenden')
}

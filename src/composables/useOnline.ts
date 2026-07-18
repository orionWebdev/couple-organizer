import { readonly, ref } from 'vue'
import { waitForPendingWrites } from 'firebase/firestore'
import { db } from '@/services/firebase'
import { showToast } from './useToast'

// Modul-Singleton wie useToast/usePaywall: der Netzstatus ist app-weit einer.
// Die eigentliche Offline-Sync macht Firestore selbst (persistentLocalCache in
// services/firebase.ts) — Schreibvorgänge landen offline im lokalen Cache und
// werden automatisch nachgezogen. Hier geht es nur um die *Anzeige*: der Nutzer
// soll sehen, dass er offline ist und dass nach dem Wiederverbinden wirklich
// synchronisiert wurde.
const online = ref(typeof navigator === 'undefined' ? true : navigator.onLine)

let bound = false

function bind() {
  if (bound || typeof window === 'undefined') return
  bound = true

  window.addEventListener('offline', () => {
    online.value = false
  })

  window.addEventListener('online', () => {
    online.value = true
    // "synchronisiert" erst melden, wenn die offline angesammelten Schreib-
    // vorgänge wirklich beim Backend angekommen sind — nicht schon beim bloßen
    // Wiedererlangen der Verbindung. Fehlerfall (Timeout o.ä.): still bleiben.
    waitForPendingWrites(db)
      .then(() => showToast('Wieder online – synchronisiert'))
      .catch(() => {})
  })
}

export function useOnline() {
  bind()
  return { isOnline: readonly(online) }
}

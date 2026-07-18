import { getApp, getApps, initializeApp } from 'firebase/app'
import { getAuth, connectAuthEmulator } from 'firebase/auth'
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check'
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions'
import {
  getFirestore,
  initializeFirestore,
  connectFirestoreEmulator,
  persistentLocalCache,
  persistentMultipleTabManager,
  persistentSingleTabManager
} from 'firebase/firestore'
import { isNative } from './platform'

// Isolierter Testbereich: mit VITE_USE_EMULATORS=true (siehe `npm run dev:emu`)
// spricht die App den lokalen Firebase-Emulator statt des Live-Projekts an.
// Auth, Firestore und die Callables landen alle auf localhost — echte Daten
// bleiben unberührt, das Seed-Skript (scripts/seed.mjs) füllt die Sandbox.
const useEmulators = import.meta.env.VITE_USE_EMULATORS === 'true'

const firebaseConfig = {
  apiKey: "AIzaSyBdkkBd9l2SD7A9MuMpsAllw9ZU5rZgNOk",
  authDomain: "couple-organizer-8b245.firebaseapp.com",
  projectId: "couple-organizer-8b245",
  storageBucket: "couple-organizer-8b245.firebasestorage.app",
  messagingSenderId: "156866789081",
  appId: "1:156866789081:web:5762540f7bbd597ed488c8"
}

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig)

export const auth = getAuth(app)

// Muss zur Region der Callables passen (functions/src/lib/config.ts).
export const functions = getFunctions(app, 'europe-west1')

// App Check schützt die Callables — ohne gültiges Token käme jeder mit curl an
// den Gemini-Proxy und damit an dein Guthaben. Für Firestore ist App Check im
// Projekt bewusst nur im Monitor-Modus, damit ältere Clients nicht hart brechen.
//
// Lokal: FIREBASE_APPCHECK_DEBUG_TOKEN=true loggt beim Start ein Debug-Token in
// die Konsole, das einmalig in der Firebase Console hinterlegt wird.
if (import.meta.env.DEV) {
  // @ts-expect-error — offizieller, nur zur Laufzeit existierender Debug-Hook
  self.FIREBASE_APPCHECK_DEBUG_TOKEN = true
}

// App Check gegen den Emulator wäre nur im Weg — die Emulatoren erzwingen es
// nicht, und der ReCaptcha-Provider braucht eine echte Domain.
const appCheckSiteKey = import.meta.env.VITE_APPCHECK_SITE_KEY
if (appCheckSiteKey && !useEmulators) {
  initializeAppCheck(app, {
    provider: new ReCaptchaEnterpriseProvider(appCheckSiteKey),
    isTokenAutoRefreshEnabled: true
  })
} else if (!useEmulators) {
  console.warn('VITE_APPCHECK_SITE_KEY fehlt — KI-Funktionen werden abgelehnt (siehe .env.example).')
}

// Use initializeFirestore with persistent cache (replaces deprecated enableIndexedDbPersistence).
// Falls back to getFirestore if already initialized (e.g. HMR).
export const db = (() => {
  try {
    return initializeFirestore(app, {
      localCache: persistentLocalCache({
        // Der Multi-Tab-Manager nimmt eine tab-übergreifende Sperre — in einer
        // App mit genau einer WebView bringt das nichts und kostet nur.
        tabManager: isNative ? persistentSingleTabManager({}) : persistentMultipleTabManager()
      })
    })
  } catch {
    return getFirestore(app)
  }
})()

// Muss NACH auth/functions/db und VOR jeder Nutzung passieren. Ports aus
// firebase.json. 127.0.0.1 statt localhost, damit es nicht an IPv6 (::1) hängt.
if (useEmulators) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
  connectFirestoreEmulator(db, '127.0.0.1', 8080)
  connectFunctionsEmulator(functions, '127.0.0.1', 5001)
  console.info('🔌 Firebase-Emulatoren aktiv (Auth :9099, Firestore :8080, Functions :5001)')
}

/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  // reCAPTCHA-Enterprise-Site-Key für App Check (Web). Ohne ihn lehnen die
  // KI-Callables jeden Aufruf ab.
  readonly VITE_APPCHECK_SITE_KEY?: string
  // RevenueCat Public SDK Key (Android). Nur im nativen Build genutzt.
  readonly VITE_RC_ANDROID_KEY?: string
  // Übergangslösung, solange die Cloud Functions nicht deployt sind: Ist dieser
  // Key gesetzt, geht der KI-Aufruf direkt an Gemini (src/services/aiDirect.ts) —
  // im Dev-Server UND im deployten Vercel-Build. Der Key landet damit im
  // öffentlichen Bundle; bewusst in Kauf genommen.
  // Nach dem Functions-Deploy hier, in .env.local UND in den Vercel-Env-Vars
  // entfernen — dann laufen die Aufrufe automatisch über die Callables.
  readonly VITE_GEMINI_API_KEY?: string
}

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { useAuth } from './composables/useAuth'
import { isNative, isWeb } from './services/platform'
import './app.css'

/* Der Splash liegt im index.html: die Wartezeit auf authReady liegt vor dem ersten
   Vue-Render. Mindeststandzeit, damit der Aufbau bis zum Claim durchläuft.
   Nativ liegt davor schon der Android-Splash (gleicher Hintergrund, nahtloser
   Übergang) — 2 s obendrauf ließen den Start kaputt wirken. */
const SPLASH_MIN_MS = isNative ? 800 : 2000
const SPLASH_FADE_MS = 400

function hideSplash() {
  const splash = document.getElementById('splash')
  if (!splash) return

  setTimeout(() => {
    splash.classList.add('is-hiding')
    setTimeout(() => splash.remove(), SPLASH_FADE_MS)
  }, Math.max(0, SPLASH_MIN_MS - performance.now()))
}

const { authReady } = useAuth()

authReady.then(async () => {
  // Der native Build hat keinen Service Worker (vite.config.ts: disable im
  // 'native'-Mode) — im WebView liegen die Assets ohnehin lokal.
  if (isWeb) {
    const { registerSW } = await import('virtual:pwa-register')
    registerSW({ immediate: true })
  }

  if (isNative) {
    const { initNative } = await import('./native/bootstrap')
    await initNative(router)
  }

  const app = createApp(App)
  app.use(router)
  app.mount('#app')
  hideSplash()
})

import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { useAuth } from './composables/useAuth'
import './app.css'

/* Der Splash liegt im index.html: die Wartezeit auf authReady liegt vor dem ersten
   Vue-Render. Mindeststandzeit, damit der Aufbau bis zum Claim durchläuft. */
const SPLASH_MIN_MS = 2000
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

authReady.then(() => {
  const app = createApp(App)
  app.use(router)
  app.mount('#app')
  hideSplash()
})

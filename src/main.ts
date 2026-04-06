import { createApp } from 'vue'
import { IonicVue } from '@ionic/vue'
import App from './App.vue'
import router from './router'
import { useAuth } from './composables/useAuth'

/* Ionic core CSS */
import '@ionic/vue/css/core.css'
import '@ionic/vue/css/normalize.css'
import '@ionic/vue/css/structure.css'
import '@ionic/vue/css/typography.css'
import '@ionic/vue/css/padding.css'
import '@ionic/vue/css/float-elements.css'
import '@ionic/vue/css/text-alignment.css'
import '@ionic/vue/css/text-transformation.css'
import '@ionic/vue/css/flex-utils.css'
import '@ionic/vue/css/display.css'
import '@ionic/vue/css/palettes/dark.always.css'

import './app.css'

// Wait for initial auth state before mounting to prevent flash of login screen
const { authReady } = useAuth()

authReady.then(() => {
  const app = createApp(App)
  app.use(IonicVue, { mode: 'ios' })
  app.use(router)
  app.mount('#app')
})

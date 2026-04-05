import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { useAuth } from './composables/useAuth'
import './app.css'

// Wait for initial auth state before mounting to prevent flash of login screen
const { authReady } = useAuth()

authReady.then(() => {
  const app = createApp(App)
  app.use(router)
  app.mount('#app')
})

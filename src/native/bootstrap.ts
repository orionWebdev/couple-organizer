// Wird nur im nativen Build geladen (dynamischer Import in main.ts), damit das
// Web-Bundle die nativen Plugins nicht mitschleppt.
import { App } from '@capacitor/app'
import { SplashScreen } from '@capacitor/splash-screen'
import type { Router } from 'vue-router'
import { handleBackButton } from '@/composables/useBackButton'
import { usePremium } from '@/composables/usePremium'

// @capacitor-community/safe-area braucht keinen Aufruf zur Laufzeit — es wird
// über capacitor.config.ts konfiguriert und sorgt dafür, dass
// env(safe-area-inset-*) im Android-WebView stimmt. Aus demselben Grund kein
// StatusBar-Setup hier: die Leistenfarben regelt das SafeArea-Plugin mit.
export async function initNative(router: Router) {
  // Erst ausblenden, wenn die WebView wirklich gezeichnet hat — sonst blitzt
  // zwischen nativem Splash und HTML-Splash kurz Weiß auf.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      SplashScreen.hide({ fadeOutDuration: 200 }).catch(() => {})
    })
  })

  App.addListener('backButton', () => {
    handleBackButton({
      isRoot: () => router.currentRoute.value.path === '/dashboard',
      goBack: () => router.back(),
      exitApp: () => App.exitApp()
    })
  })

  // Der RevenueCat-Webhook kann verloren gehen oder verspätet ankommen. Beim
  // Zurückkehren in die App gleichen wir gegen RevenueCat ab.
  App.addListener('resume', () => {
    usePremium().refreshOnResume()
  })
}

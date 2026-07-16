import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'de.keyperformance.together',
  appName: 'TwoDo',
  webDir: 'dist',

  server: {
    // https statt capacitor:// → Origin ist https://localhost, also ein Secure
    // Context. Firebase Auth und die IndexedDB-Persistenz von Firestore
    // brauchen das. Der Origin muss in den CORS-Listen der Callables stehen
    // (functions/src/lib/config.ts).
    androidScheme: 'https'
  },

  android: {
    // Android 15+ erzwingt Edge-to-Edge. 'disable' lässt die WebView unter die
    // Systemleisten laufen; die Insets kommen über @capacitor-community/safe-area
    // als CSS-Variablen rein (siehe src/native/bootstrap.ts + src/app.css).
    adjustMarginsForEdgeToEdge: 'disable',
    backgroundColor: '#fdfaf5'
  },

  plugins: {
    // Repariert env(safe-area-inset-*) im Android-WebView (siehe src/app.css).
    // Hellgrundige App → dunkle Icons in Status- und Navigationsleiste.
    SafeArea: {
      statusBarStyle: 'dark',
      navigationBarStyle: 'dark',
      initialViewportFitCover: true
    },
    SplashScreen: {
      // Wir blenden von Hand aus, sobald die WebView das erste Mal gezeichnet
      // hat — sonst blitzt zwischen nativem Splash und HTML-Splash Weiß auf.
      launchAutoHide: false,
      backgroundColor: '#fdfaf5',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: false
    },
    Keyboard: {
      resize: 'native'
    },
    CapacitorHttp: {
      // MUSS aus bleiben: aktiviert würde es fetch() patchen und damit die
      // Streaming-Verbindungen des Firestore-SDK kaputt machen.
      enabled: false
    }
  }
}

export default config

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath } from 'node:url'

// `--mode native` baut das Bundle für den Capacitor-WebView. Einziger
// Unterschied: kein Service Worker. Im WebView liegen die Assets ohnehin lokal,
// und `autoUpdate` würde nach einem App-Update das alte JS im SW-Cache
// festnageln — mit keinem Weg, es von außen zu invalidieren.
export default defineConfig(({ mode }) => {
  const isNative = mode === 'native'

  return {
    plugins: [
      vue(),
      tailwindcss(),
      VitePWA({
        disable: isNative,
        // Registrierung passiert von Hand in main.ts (nur im Web), damit der
        // native Build kein registerSW.js in die index.html injiziert bekommt.
        injectRegister: null,
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
        manifest: {
          id: '/',
          name: 'TwoDo',
          short_name: 'TwoDo',
          description: 'Euer Zuhause, gemeinsam.',
          lang: 'de',
          dir: 'ltr',
          theme_color: '#fdfaf5',
          background_color: '#fdfaf5',
          display: 'standalone',
          orientation: 'portrait',
          scope: '/',
          start_url: '/',
          /* "any" = gerundete Kachel mit transparenten Ecken (wird ungemaskt gezeigt),
             "maskable" = randlos-quadratisch, das OS legt seine eigene Maske drüber. */
          icons: [
            { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
            { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
            { src: 'maskable-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
            { src: 'maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
          ]
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}']
        }
      })
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      }
    }
  }
})

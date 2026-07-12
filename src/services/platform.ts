import { Capacitor } from '@capacitor/core'

// Einziger Verzweigungspunkt zwischen Web-PWA und nativer App. Alles andere
// im Code fragt hier nach, statt selbst Capacitor zu importieren.
export const isNative = Capacitor.isNativePlatform()
export const isWeb = !isNative
export const platform = Capacitor.getPlatform() // 'web' | 'android' | 'ios'

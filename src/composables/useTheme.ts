import { ref, readonly } from 'vue'

// Modul-Singleton wie usePaywall/useToast: das Theme ist App-weit eins, und die
// Wahl muss vor dem ersten Vue-Render am <html> hängen — also kein State pro
// Aufrufer. Logik aus reference/design_handoff_modern_ui/theme.js.
//
// Bewusst localStorage statt User-Prefs in Firestore: das Theme gehört ans
// Gerät (Handy dunkel, Laptop hell) und muss ohne Firestore-Roundtrip lesbar
// sein — ein Wert, der erst nach dem Login ankommt, käme für den ersten Paint
// zu spät.
export type ThemePreference = 'system' | 'light' | 'dark'

const STORAGE_KEY = 'twodo-theme'
const VALUES: ThemePreference[] = ['system', 'light', 'dark']

function isPreference(value: unknown): value is ThemePreference {
  return VALUES.includes(value as ThemePreference)
}

// localStorage kann werfen (Safari im Privatmodus, blockierte Cookies) — dann
// gilt der Default, statt den App-Start zu verlieren.
function readPreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return isPreference(stored) ? stored : 'system'
  } catch {
    return 'system'
  }
}

const preference = ref<ThemePreference>(readPreference())

// Browser-/Systemleiste. Anders als die Flächen der App hängt sie nicht an
// einem CSS-Token, sondern muss aktiv nachgezogen werden. Werte = --bg hell/dunkel
// aus app.css, dieselben wie im Pre-Paint-Skript in index.html.
const THEME_COLOR = { light: '#fdfaf5', dark: '#17130f' }

function prefersDark() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function syncThemeColor(pref: ThemePreference) {
  const meta = document.querySelector('meta[name="theme-color"]')
  if (!meta) return
  const dark = pref === 'dark' || (pref === 'system' && prefersDark())
  meta.setAttribute('content', dark ? THEME_COLOR.dark : THEME_COLOR.light)
}

/** "system" entfernt das Attribut, damit die Media-Query in app.css wieder zieht. */
function applyTheme(pref: ThemePreference) {
  const root = document.documentElement
  if (pref === 'system') root.removeAttribute('data-theme')
  else root.setAttribute('data-theme', pref)
  syncThemeColor(pref)
}

export function setTheme(pref: ThemePreference): ThemePreference {
  const value = isPreference(pref) ? pref : 'system'
  preference.value = value
  try {
    localStorage.setItem(STORAGE_KEY, value)
  } catch {
    // Nicht persistierbar: die Wahl gilt trotzdem für diese Sitzung.
  }
  applyTheme(value)
  return value
}

/** Einmalig beim App-Start, vor dem Mount. */
export function initTheme() {
  applyTheme(preference.value)

  // Flächen und Text kippen bei "system" von selbst — das macht die Media-Query
  // in app.css. Die theme-color-Leiste kann das nicht, die braucht diesen Hook.
  window
    .matchMedia('(prefers-color-scheme: dark)')
    .addEventListener('change', () => {
      if (preference.value === 'system') syncThemeColor('system')
    })
}

export function useTheme() {
  return { theme: readonly(preference), setTheme }
}

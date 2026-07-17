/* ══════════════════════════════════════════════════════════════════
   TwoDo · Modern UI — THEME CONTROLLER
   Dark/Light mit drei Zuständen: "system" | "light" | "dark".
   - "system": kein data-theme am <html> → @media (prefers-color-scheme) zieht.
   - "light"/"dark": setzt data-theme am <html> und übersteuert die System-Wahl.
   Persistenz in localStorage. Framework-agnostisch (nutzbar aus main.ts,
   einem Pinia-Store oder direkt).
   ══════════════════════════════════════════════════════════════════ */

const STORAGE_KEY = "twodo-theme";
const VALUES = ["system", "light", "dark"];

export function getThemePreference() {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return VALUES.includes(v) ? v : "system";
  } catch (e) {
    return "system";
  }
}

/** Wendet die Präferenz auf <html> an. */
export function applyTheme(pref) {
  const root = document.documentElement;
  if (pref === "system") {
    root.removeAttribute("data-theme"); // Media-Query entscheidet
  } else {
    root.setAttribute("data-theme", pref); // light | dark erzwungen
  }
}

/** Setzt + persistiert + wendet an. Aufrufen aus dem Einstellungs-Screen. */
export function setThemePreference(pref) {
  const value = VALUES.includes(pref) ? pref : "system";
  try { localStorage.setItem(STORAGE_KEY, value); } catch (e) {}
  applyTheme(value);
  return value;
}

/** Einmalig beim App-Start (vor dem ersten Paint) aufrufen. */
export function initTheme() {
  applyTheme(getThemePreference());
  // Live auf Systemwechsel reagieren, solange "system" aktiv ist.
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  const onChange = () => { if (getThemePreference() === "system") applyTheme("system"); };
  mq.addEventListener ? mq.addEventListener("change", onChange) : mq.addListener(onChange);
}

/* ── Einstellungs-Screen: drei Optionen verdrahten ─────────────────
   import { getThemePreference, setThemePreference } from "@/theme";
   const current = ref(getThemePreference());               // "system" default
   function choose(v) { current.value = setThemePreference(v); }
   // Buttons/Radio: System · Hell · Dunkel  → choose('system'|'light'|'dark')
   ────────────────────────────────────────────────────────────────── */

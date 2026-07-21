<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { useCouple } from '@/composables/useCouple'
import { useTheme, type ThemePreference } from '@/composables/useTheme'
import { useBelegung } from '@/composables/useBelegung'
import { useExpenses } from '@/composables/useExpenses'
import { showToast } from '@/composables/useToast'
import { showPaywall } from '@/composables/usePaywall'
import { buildExpensesCsv, buildBookingsIcs, saveOrShare } from '@/services/export'
import { resolveFoodProfile, foodProfileSummary, hasFoodProfileContent } from '@/utils/foodProfile'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import IconGridPicker from '@/components/ui/IconGridPicker.vue'
import SegmentToggle from '@/components/ui/SegmentToggle.vue'
import ToggleSwitch from '@/components/ui/ToggleSwitch.vue'
import InviteCodeBox from '@/components/couple/InviteCodeBox.vue'

const router = useRouter()
const { user, logout, updatePrefs, deleteAccount } = useAuth()
const {
  couple, isPremium, updateBudget, regenerateInviteCode, updateMyIcon, resetCoupleData,
} = useCouple()

// Die vier bearbeitbaren Listen liegen jeweils auf einer eigenen Unterseite
// (/settings/kategorien/:type) — hier steht nur noch der Weg dorthin.
const CATEGORY_LINKS = [
  { type: 'ausgaben', icon: '💶', title: 'Ausgaben-Kategorien', hint: 'Finanzen & Einkauf' },
  { type: 'rezepte', icon: '🍽️', title: 'Rezept-Kategorien', hint: 'Filter im Rezept-Wiki' },
  { type: 'ideen', icon: '💡', title: 'Ideen-Kategorien', hint: 'Ideen für uns' },
  { type: 'belegung', icon: '🚗', title: 'Geteilte Ressourcen', hint: 'Auto, E-Bike, Hund …' },
] as const

const AVATAR_ICONS = ['🦊', '🦉', '🐻', '🐨', '🐢', '🦄', '🐸', '🐙', '🌵', '🍩', '🌟', '🔥', '🎧', '🎨', '⚡', '🌈']

// Zeigt in der Settings-Zeile, ob überhaupt schon etwas hinterlegt ist.
const foodProfileHint = computed(() => {
  const p = resolveFoodProfile(couple.value)
  return hasFoodProfileContent(p) ? foodProfileSummary(p) : 'Portionen, Vorlieben & No-Gos'
})

function goBack() {
  router.push('/dashboard')
}

// ── Profil ────────────────────────────────────────────────────
const showAvatarSheet = ref(false)
const myIcon = computed(() => (user.value ? couple.value?.memberIcons?.[user.value.uid] ?? '' : ''))
const myInitial = computed(() => user.value?.displayName?.charAt(0).toUpperCase() || '🙂')

async function pickAvatar(icon: string) {
  const ok = await updateMyIcon(icon)
  showToast(ok ? 'Avatar gespeichert' : 'Fehler beim Speichern')
  if (ok) showAvatarSheet.value = false
}

// Emoji entfernen → zurück zur Initiale des eigenen Namens.
async function resetAvatar() {
  const ok = await updateMyIcon(null)
  showToast(ok ? 'Zurück zu Initialen' : 'Fehler beim Speichern')
  if (ok) showAvatarSheet.value = false
}

// ── Einladung ─────────────────────────────────────────────────
async function handleRegenerateCode() {
  const code = await regenerateInviteCode()
  showToast(code ? 'Neuer Code erstellt' : 'Fehler beim Erstellen')
}

// ── Benachrichtigungen ────────────────────────────────────────
const notifyPush = computed(() => user.value?.notifyPush ?? true)

async function togglePush(value: boolean) {
  await updatePrefs({ notifyPush: value })
}

// ── Darstellung ───────────────────────────────────────────────
const { theme, setTheme } = useTheme()
const THEME_OPTIONS = [
  { label: 'System', value: 'system' },
  { label: 'Hell', value: 'light' },
  { label: 'Dunkel', value: 'dark' },
]

const themePref = computed({
  get: () => theme.value as string,
  set: (value: string) => { setTheme(value as ThemePreference) },
})

// ── Sprache ───────────────────────────────────────────────────
const languageEnglish = computed(() => user.value?.languageEnglish ?? false)

async function toggleLanguage(value: boolean) {
  await updatePrefs({ languageEnglish: value })
}

// ── Finanzen: Budget ──────────────────────────────────────────
// couple lädt asynchron per onSnapshot — Feld einmalig beim ersten Laden
// befüllen, ohne spätere Tippeingaben zu überschreiben.
const budgetInput = ref('')
let budgetPrefilled = false
watch(couple, (c) => {
  if (budgetPrefilled || !c) return
  budgetPrefilled = true
  budgetInput.value = c.monthlyBudget ? (c.monthlyBudget / 100).toFixed(2) : ''
}, { immediate: true })

// Gleiche Semantik wie im Dashboard-Sheet: ein leeres Feld entfernt das Budget
// bewusst, eine unlesbare Eingabe ist ein Fehler und darf nicht stillschweigend
// als "kein Budget" durchgehen.
async function saveBudget() {
  const raw = budgetInput.value.trim().replace(',', '.')

  if (raw === '') {
    const ok = await updateBudget(null)
    showToast(ok ? 'Budget entfernt' : 'Fehler beim Speichern')
    return
  }

  const euros = parseFloat(raw)
  if (isNaN(euros) || euros <= 0) {
    showToast('Bitte einen Betrag eingeben')
    return
  }

  const ok = await updateBudget(Math.round(euros * 100))
  showToast(ok ? 'Budget gespeichert' : 'Fehler beim Speichern')
}

// ── Export (Premium) ──────────────────────────────────────────
// Die Ressourcen/Belegungen werden auf /settings/kategorien/belegung gepflegt;
// hier hängen sie nur noch am ICS-Export.
const coupleId = computed(() => user.value?.coupleId ?? null)
const { resources, bookings } = useBelegung(coupleId)
const { expenses } = useExpenses(coupleId)
const exporting = ref(false)

async function runExport(filename: string, content: string, mimeType: string, empty: boolean) {
  if (!isPremium.value) {
    showPaywall('export')
    return
  }
  if (empty) {
    showToast('Nichts zu exportieren')
    return
  }

  exporting.value = true
  try {
    await saveOrShare(filename, content, mimeType)
  } catch (err) {
    console.error('Export fehlgeschlagen:', err)
    showToast('Export fehlgeschlagen')
  } finally {
    exporting.value = false
  }
}

function handleExportExpenses() {
  return runExport(
    'twodo-ausgaben.csv',
    buildExpensesCsv(expenses.value, couple.value),
    'text/csv',
    expenses.value.length === 0
  )
}

function handleExportBookings() {
  return runExport(
    'twodo-belegungen.ics',
    buildBookingsIcs(bookings.value, resources.value, couple.value),
    'text/calendar',
    bookings.value.length === 0
  )
}

// ── Konto / Gefahrenzone ──────────────────────────────────────
async function handleLogout() {
  await logout()
  router.push('/login')
}

const pendingDanger = ref<'delete-account' | 'reset' | null>(null)

function askDeleteAccount() {
  pendingDanger.value = 'delete-account'
}

function askReset() {
  pendingDanger.value = 'reset'
}

async function confirmDanger() {
  if (pendingDanger.value === 'delete-account') {
    const result = await deleteAccount()
    if (result.ok) {
      router.push('/login')
    } else {
      showToast(result.message ?? 'Fehler beim Löschen')
    }
  } else if (pendingDanger.value === 'reset') {
    const ok = await resetCoupleData()
    showToast(ok ? 'App zurückgesetzt' : 'Fehler beim Zurücksetzen')
  }
  pendingDanger.value = null
}
</script>

<template>
  <div class="settings-page">
    <div class="detail-header">
      <button class="back-caret" type="button" @click="goBack" aria-label="Zurück">‹</button>
      <span class="page-title">Einstellungen</span>
    </div>

    <div class="settings-scroll">
      <!-- Profil -->
      <div class="section-label section-gap">Profil</div>
      <div class="card profile-card" @click="showAvatarSheet = true">
        <span class="avatar-badge" :class="{ 'avatar-badge--initial': !myIcon }">{{ myIcon || myInitial }}</span>
        <div class="profile-text">
          <span class="profile-name">{{ user?.displayName }}</span>
          <span class="profile-hint">Avatar ändern</span>
        </div>
        <span class="chevron">›</span>
      </div>

      <!-- TwoDo Plus -->
      <div class="section-label section-gap">Abo</div>
      <div class="card plus-card" @click="router.push('/premium')">
        <span class="plus-badge" :class="{ 'plus-badge--active': isPremium }">{{ isPremium ? '💛' : '✨' }}</span>
        <div class="profile-text">
          <span class="profile-name">{{ isPremium ? 'TwoDo Plus aktiv' : 'TwoDo Plus' }}</span>
          <span class="profile-hint">{{ isPremium ? 'Abo verwalten' : 'KI, Auswertungen & mehr freischalten' }}</span>
        </div>
        <span class="chevron">›</span>
      </div>

      <!-- Export (Premium) -->
      <div class="section-label section-gap">Export</div>
      <div class="card">
        <button class="row-action" type="button" :disabled="exporting" @click="handleExportExpenses">
          <span>Ausgaben als CSV</span>
          <span v-if="!isPremium" class="lock">🔒</span>
        </button>
        <button class="row-action" type="button" :disabled="exporting" @click="handleExportBookings">
          <span>Belegungen als Kalender (.ics)</span>
          <span v-if="!isPremium" class="lock">🔒</span>
        </button>
      </div>

      <!-- Einladung -->
      <div class="section-label section-gap">Einladung</div>
      <div class="card">
        <InviteCodeBox v-if="couple" :code="couple.inviteCode" />
        <button class="text-btn" type="button" @click="handleRegenerateCode">Neu erstellen</button>
      </div>

      <!-- Benachrichtigungen -->
      <div class="section-label section-gap">Benachrichtigungen</div>
      <div class="card">
        <div class="toggle-row">
          <span class="toggle-label">Push-Benachrichtigungen</span>
          <ToggleSwitch :modelValue="notifyPush" @update:modelValue="togglePush" />
        </div>
      </div>

      <!-- Schnell-Aufgaben: persönliche Favoriten-Routinen fürs Dashboard -->
      <div class="section-label section-gap">Schnell-Aufgaben</div>
      <div class="card cat-card">
        <button class="cat-link" type="button" @click="router.push('/settings/schnellaufgaben')">
          <span class="cat-link-icon">⚡</span>
          <span class="profile-text">
            <span class="cat-link-title">Meine Routinen</span>
            <span class="profile-hint">Favoriten fürs Dashboard</span>
          </span>
          <span class="chevron">›</span>
        </button>
      </div>

      <!-- Essen: dauerhaftes Profil, fließt in jeden KI-Rezeptaufruf ein -->
      <div class="section-label section-gap">Essen</div>
      <div class="card cat-card">
        <button class="cat-link" type="button" @click="router.push('/settings/essprofil')">
          <span class="cat-link-icon">🍽</span>
          <span class="profile-text">
            <span class="cat-link-title">Ess-Profil</span>
            <span class="profile-hint">{{ foodProfileHint }}</span>
          </span>
          <span class="chevron">›</span>
        </button>
      </div>

      <!-- Kategorien: je Liste eine eigene Unterseite -->
      <div class="section-label section-gap">Kategorien</div>
      <div class="card cat-card">
        <button
          v-for="link in CATEGORY_LINKS"
          :key="link.type"
          class="cat-link"
          type="button"
          @click="router.push(`/settings/kategorien/${link.type}`)"
        >
          <span class="cat-link-icon">{{ link.icon }}</span>
          <span class="profile-text">
            <span class="cat-link-title">{{ link.title }}</span>
            <span class="profile-hint">{{ link.hint }}</span>
          </span>
          <span class="chevron">›</span>
        </button>
      </div>

      <!-- Finanzen -->
      <div class="section-label section-gap">Finanzen</div>
      <div class="card">
        <div class="field-label">Monatsbudget (€)</div>
        <div class="budget-row">
          <!-- type="text" + inputmode="decimal", NICHT type="number": ein
               Zahlenfeld verwirft "800,00" und liefert einen leeren String
               zurück — das Feld leert sich beim Tippen und das Budget würde
               beim Speichern gelöscht statt gesetzt. -->
          <input
            v-model="budgetInput"
            class="app-field"
            type="text"
            inputmode="decimal"
            placeholder="z. B. 800"
            @keyup.enter="saveBudget"
          />
          <button class="text-btn budget-save" type="button" @click="saveBudget">Speichern</button>
        </div>
        <p class="field-hint">Leer lassen entfernt das Budget.</p>
      </div>

      <!-- Darstellung -->
      <div class="section-label section-gap">Darstellung</div>
      <div class="card">
        <div class="field-label">Design</div>
        <SegmentToggle v-model="themePref" :options="THEME_OPTIONS" class="theme-seg" />
        <p class="field-hint">„System“ folgt der Einstellung deines Geräts.</p>
      </div>

      <!-- Sprache -->
      <div class="section-label section-gap">Sprache</div>
      <div class="card">
        <div class="toggle-row">
          <span class="toggle-label">App auf Englisch</span>
          <ToggleSwitch :modelValue="languageEnglish" @update:modelValue="toggleLanguage" />
        </div>
        <p class="toggle-hint">Automatische Übersetzung · Beta</p>
      </div>

      <!-- Konto -->
      <div class="section-label section-gap">Konto</div>
      <div class="card account-card">
        <button class="account-btn" type="button" @click="handleLogout">Abmelden</button>
        <button class="account-btn account-btn--danger" type="button" @click="askDeleteAccount">Konto löschen</button>
      </div>

      <!-- Gefahrenzone -->
      <div class="section-label section-gap">Gefahrenzone</div>
      <div class="card">
        <button class="account-btn account-btn--danger" type="button" @click="askReset">
          App komplett zurücksetzen
        </button>
      </div>
    </div>

    <BottomSheet :isOpen="showAvatarSheet" title="Avatar wählen" @close="showAvatarSheet = false">
      <IconGridPicker :modelValue="myIcon" :icons="AVATAR_ICONS" @update:modelValue="pickAvatar" />
      <button v-if="myIcon" class="reset-avatar-btn" type="button" @click="resetAvatar">
        <span class="reset-avatar-badge">{{ myInitial }}</span>
        Zurück zu Initialen
      </button>
    </BottomSheet>

    <BottomSheet :isOpen="!!pendingDanger" title="Bist du sicher?" @close="pendingDanger = null">
      <p class="confirm-text">
        {{ pendingDanger === 'delete-account'
          ? 'Willst du wirklich dein Konto löschen? Das kann nicht rückgängig gemacht werden.'
          : 'Willst du wirklich die App zurücksetzen? Alle Aufgaben, Einkäufe, Ausgaben und Rezepte werden dauerhaft gelöscht.' }}
      </p>
      <div class="confirm-actions">
        <button class="text-btn confirm-cancel" type="button" @click="pendingDanger = null">Abbrechen</button>
        <button class="btn-primary confirm-yes" type="button" @click="confirmDanger">Ja, wirklich</button>
      </div>
    </BottomSheet>
  </div>
</template>

<style scoped>
.settings-page {
  min-height: 100%;
  display: flex;
  flex-direction: column;
}

.detail-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: calc(var(--safe-top) + 20px) var(--screen-pad) 8px;
}

.back-caret {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  background: transparent;
  border: none;
  font-size: 24px;
  font-weight: 700;
  color: var(--text-faint);
  cursor: pointer;
}

.back-caret:active {
  color: var(--text);
}

.page-title {
  font-family: var(--font-headline);
  font-size: 19px;
  font-weight: 700;
  color: var(--text);
}

.settings-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 0 var(--screen-pad) 32px;
}

.section-gap {
  margin: 20px 0 8px;
}

.card {
  background: var(--surface);
  border: 1px solid var(--border-softer);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-card);
  padding: 18px;
}

.profile-card {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
}

.plus-card {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
}

.plus-badge {
  flex-shrink: 0;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  background: var(--surface-deep);
}

.plus-badge--active {
  background: var(--accent-tint);
}

.row-action {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 12px 0;
  border: none;
  background: none;
  color: var(--text);
  font-family: var(--font-body);
  font-size: 14px;
  font-weight: 600;
  text-align: left;
  cursor: pointer;
}

.row-action + .row-action {
  border-top: 1px solid var(--border-softer);
}

.row-action:disabled {
  opacity: 0.55;
}

.lock {
  font-size: 13px;
}

.avatar-badge {
  flex-shrink: 0;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  background: var(--surface-deep);
  border: 2px solid var(--surface);
  box-shadow: 0 2px 6px rgba(60, 45, 30, 0.12);
}

/* Ohne Avatar-Emoji: Initiale auf Personenfarbe statt neutralem Grund */
.avatar-badge--initial {
  font-size: 20px;
  font-weight: 700;
  color: #fff;
  background: var(--accent);
}

.profile-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.profile-name {
  font-family: var(--font-headline);
  font-size: 15px;
  font-weight: 700;
  color: var(--text);
}

.profile-hint {
  font-size: 11.5px;
  color: var(--text-meta);
}

.chevron {
  color: var(--text-faint);
  font-size: 20px;
}

.text-btn {
  display: block;
  margin-top: 12px;
  background: none;
  border: none;
  padding: 0;
  color: var(--accent);
  font-family: var(--font-body);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}

.reset-avatar-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
  margin-top: 16px;
  padding: 12px 0;
  background: var(--surface-deep);
  border: 1px solid var(--border-softer);
  border-radius: var(--radius-card);
  color: var(--text-secondary);
  font-family: var(--font-body);
  font-size: 13.5px;
  font-weight: 700;
  cursor: pointer;
}

.reset-avatar-badge {
  flex-shrink: 0;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  color: #fff;
  background: var(--accent);
  border: 2px solid var(--surface);
  box-shadow: 0 2px 6px rgba(60, 45, 30, 0.12);
}

.toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.toggle-label {
  font-size: 13.5px;
  font-weight: 700;
  color: var(--text);
}

.toggle-hint {
  font-size: 11.5px;
  color: var(--text-meta);
  margin: 8px 0 0;
}

.field-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.6px;
  text-transform: uppercase;
  color: var(--text-meta);
  margin-bottom: 8px;
}

.field-hint {
  margin: 8px 0 0;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-meta);
}

/* Kategorien-Sektion: vier Zeilen, jede führt auf ihre eigene Unterseite. */
.cat-card {
  padding: 4px 14px;
}

.cat-link {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 12px 0;
  border: none;
  background: none;
  text-align: left;
  cursor: pointer;
}

.cat-link + .cat-link {
  border-top: 1px solid var(--border-softer);
}

.cat-link-icon {
  flex-shrink: 0;
  width: 34px;
  height: 34px;
  border-radius: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  background: var(--surface-deep);
}

.cat-link-title {
  font-size: 13.5px;
  font-weight: 700;
  color: var(--text);
}

/* Der Segment-Toggle steht sonst auf --bg; hier liegt er in einer Karte, also
   eingelassen statt erhaben. `.card`-Präfix, damit die Regel die Scoped-Styles
   von SegmentToggle sicher schlägt (gleiche Spezifität würde die Quellreihen-
   folge im Bundle entscheiden). */
.card .theme-seg {
  width: 100%;
  border-radius: 12px;
  background: var(--surface-deep);
  box-shadow: none;
}

.card .theme-seg :deep(.seg-btn) {
  padding: 11px 0;
}

.budget-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.budget-row .app-field {
  flex: 1;
}

.budget-save {
  margin-top: 0;
  flex-shrink: 0;
}

.account-card {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 4px;
}

.account-btn {
  text-align: left;
  padding: 12px 10px;
  background: none;
  border: none;
  border-radius: 10px;
  font-family: var(--font-body);
  font-size: 14px;
  font-weight: 700;
  color: var(--text);
  cursor: pointer;
}

.account-btn--danger {
  color: var(--danger);
}

.confirm-text {
  font-size: 13.5px;
  color: var(--text-secondary);
  line-height: 1.5;
  margin: 0 0 18px;
}

.confirm-actions {
  display: flex;
  gap: 10px;
}

.confirm-cancel {
  flex: 1;
  margin-top: 0;
  text-align: center;
  padding: 13px;
  background: var(--surface-deep);
  border-radius: 14px;
}

.confirm-yes {
  flex: 1;
  background: var(--danger);
  box-shadow: none;
}
</style>

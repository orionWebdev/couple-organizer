<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { useCouple } from '@/composables/useCouple'
import { showToast } from '@/composables/useToast'
import { resolveExpenseCategories, EXPENSE_CATEGORY_ICON_CHOICES, categoryColor } from '@/utils/expenseCategories'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import IconGridPicker from '@/components/ui/IconGridPicker.vue'
import ToggleSwitch from '@/components/ui/ToggleSwitch.vue'
import InviteCodeBox from '@/components/couple/InviteCodeBox.vue'

const router = useRouter()
const { user, logout, updatePrefs, deleteAccount } = useAuth()
const { couple, updateBudget, regenerateInviteCode, updateMyIcon, addExpenseCategory, removeExpenseCategory, resetCoupleData } = useCouple()

const AVATAR_ICONS = ['🦊', '🦉', '🐻', '🐨', '🐢', '🦄', '🐸', '🐙', '🌵', '🍩', '🌟', '🔥', '🎧', '🎨', '⚡', '🌈']

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

async function saveBudget() {
  const euros = parseFloat(budgetInput.value.replace(',', '.'))
  const ok = await updateBudget(isNaN(euros) || euros <= 0 ? null : Math.round(euros * 100))
  showToast(ok ? 'Budget gespeichert' : 'Fehler beim Speichern')
}

// ── Finanzen: Kategorien ──────────────────────────────────────
const categories = computed(() => resolveExpenseCategories(couple.value))
const showCategoryForm = ref(false)
const newCategoryName = ref('')
const newCategoryIcon = ref(EXPENSE_CATEGORY_ICON_CHOICES[0])

async function handleAddCategory() {
  const ok = await addExpenseCategory(newCategoryName.value, newCategoryIcon.value)
  if (ok) {
    newCategoryName.value = ''
    newCategoryIcon.value = EXPENSE_CATEGORY_ICON_CHOICES[0]
    showCategoryForm.value = false
    showToast('Kategorie hinzugefügt')
  } else {
    showToast('Fehler beim Hinzufügen')
  }
}

async function handleRemoveCategory(id: string) {
  const ok = await removeExpenseCategory(id)
  showToast(ok ? 'Kategorie entfernt' : 'Das geht nicht — mindestens eine Kategorie muss bleiben')
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

      <!-- Finanzen -->
      <div class="section-label section-gap">Finanzen</div>
      <div class="card">
        <div class="field-label">Monatsbudget (€)</div>
        <div class="budget-row">
          <input
            v-model="budgetInput"
            class="app-field"
            type="number"
            inputmode="decimal"
            placeholder="z. B. 800"
            @keyup.enter="saveBudget"
          />
          <button class="text-btn budget-save" type="button" @click="saveBudget">Speichern</button>
        </div>

        <div class="field-label categories-label">Kategorien</div>
        <div class="category-list">
          <div v-for="c in categories" :key="c.id" class="category-row">
            <span class="category-icon" :style="{ background: categoryColor(categories, c.id) }">{{ c.icon }}</span>
            <span class="category-name">{{ c.name }}</span>
            <button class="remove-btn" type="button" @click="handleRemoveCategory(c.id)" aria-label="Entfernen">✕</button>
          </div>
        </div>

        <button v-if="!showCategoryForm" class="text-btn" type="button" @click="showCategoryForm = true">
          + Kategorie hinzufügen
        </button>
        <template v-else>
          <input
            v-model="newCategoryName"
            class="app-field cat-name-field"
            type="text"
            placeholder="Kategoriename"
          />
          <IconGridPicker
            v-model="newCategoryIcon"
            :icons="EXPENSE_CATEGORY_ICON_CHOICES"
          />
          <div class="cat-form-actions">
            <button class="text-btn" type="button" @click="showCategoryForm = false">Abbrechen</button>
            <button class="btn-primary cat-save-btn" type="button" :disabled="!newCategoryName.trim()" @click="handleAddCategory">
              Kategorie speichern
            </button>
          </div>
        </template>
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
  padding: 14px;
}

.profile-card {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
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
  border: 2px solid #fff;
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
  border: 2px solid #fff;
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

.categories-label {
  margin-top: 16px;
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

.category-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.category-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.category-icon {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  border: 2px solid #fff;
  box-shadow: 0 2px 6px rgba(60, 45, 30, 0.12);
}

.category-name {
  flex: 1;
  min-width: 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.remove-btn {
  flex-shrink: 0;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  border: none;
  background: var(--danger-tint);
  color: var(--danger);
  font-size: 12px;
  cursor: pointer;
}

.cat-name-field {
  margin-top: 12px;
  margin-bottom: 10px;
}

.cat-form-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 12px;
}

.cat-form-actions .text-btn {
  margin-top: 0;
}

.cat-save-btn {
  width: auto;
  padding: 10px 18px;
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

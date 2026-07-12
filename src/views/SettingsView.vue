<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { useCouple } from '@/composables/useCouple'
import { useBelegung } from '@/composables/useBelegung'
import { useExpenses } from '@/composables/useExpenses'
import { useBucketList } from '@/composables/useBucketList'
import { showToast } from '@/composables/useToast'
import { showPaywall } from '@/composables/usePaywall'
import { buildExpensesCsv, buildBookingsIcs, saveOrShare } from '@/services/export'
import { resolveExpenseCategories, EXPENSE_CATEGORY_ICON_CHOICES, categoryColor } from '@/utils/expenseCategories'
import { resolveIdeaCategories, ideaCategory, IDEA_ICON_CHOICES } from '@/utils/ideen'
import { RESOURCE_ICONS } from '@/utils/belegung'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import IconGridPicker from '@/components/ui/IconGridPicker.vue'
import ToggleSwitch from '@/components/ui/ToggleSwitch.vue'
import InviteCodeBox from '@/components/couple/InviteCodeBox.vue'

const router = useRouter()
const { user, logout, updatePrefs, deleteAccount } = useAuth()
const {
  couple, isPremium, updateBudget, regenerateInviteCode, updateMyIcon,
  addExpenseCategory, removeExpenseCategory,
  addIdeaCategory, updateIdeaCategory, removeIdeaCategory,
  resetCoupleData,
} = useCouple()

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

// ── Belegung: Ressourcen ──────────────────────────────────────
// Die geteilten Dinge (Auto, E-Bike, Hund …) werden nur hier verwaltet — die
// Belegung selbst lebt als Timeline-Karte auf dem Dashboard.
const coupleId = computed(() => user.value?.coupleId ?? null)
const { resources, bookings, canAddResource, countBookings, addResource, updateResource, deleteResource } = useBelegung(coupleId)

// ── Export (Premium) ──────────────────────────────────────────
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
    'together-ausgaben.csv',
    buildExpensesCsv(expenses.value, couple.value),
    'text/csv',
    expenses.value.length === 0
  )
}

function handleExportBookings() {
  return runExport(
    'together-belegungen.ics',
    buildBookingsIcs(bookings.value, resources.value, couple.value),
    'text/calendar',
    bookings.value.length === 0
  )
}

interface ResourceForm { id: string | null; name: string; emoji: string }
const resourceForm = ref<ResourceForm | null>(null)
const pendingResourceDelete = ref<ResourceForm | null>(null)

function startNewResource() {
  if (!canAddResource.value) {
    showPaywall('belegungResources')
    return
  }
  resourceForm.value = { id: null, name: '', emoji: RESOURCE_ICONS[0] }
}

function startEditResource(resource: { id: string; name: string; emoji: string }) {
  resourceForm.value = { id: resource.id, name: resource.name, emoji: resource.emoji }
}

async function saveResource() {
  const form = resourceForm.value
  if (!form?.name.trim()) return

  const ok = form.id
    ? !!(await updateResource(form.id, form.name, form.emoji))
    : !!(await addResource(form.name, form.emoji))

  if (ok) {
    showToast(form.id ? 'Ressource gespeichert' : `${form.emoji} ${form.name.trim()} angelegt`)
    resourceForm.value = null
  } else {
    showToast('Fehler beim Speichern')
  }
}

// Löschen nimmt die Belegungen der Ressource mit — daher die Rückfrage.
async function confirmResourceDelete() {
  const form = pendingResourceDelete.value
  if (!form?.id) return
  const ok = await deleteResource(form.id)
  showToast(ok ? 'Ressource gelöscht' : 'Fehler beim Löschen')
  pendingResourceDelete.value = null
  if (ok) resourceForm.value = null
}

// ── Planung: Ideen-Kategorien ─────────────────────────────────
// Gleiches Formular-Muster wie die Ressourcen: Zeile antippen = bearbeiten,
// ✕ = löschen. Löschen nimmt die Ideen NICHT mit — sie behalten ihre Kategorie
// und erscheinen im Ideen-Widget nur noch unter "Alle".
const { items: ideas } = useBucketList(coupleId)
const ideaCategories = computed(() => resolveIdeaCategories(couple.value))

function countIdeas(id: string): number {
  return ideas.value.filter((i) => ideaCategory(i.category, ideaCategories.value) === id).length
}

interface IdeaCategoryForm { id: string | null; label: string; emoji: string }
const ideaForm = ref<IdeaCategoryForm | null>(null)
const pendingIdeaDelete = ref<IdeaCategoryForm | null>(null)

function startNewIdeaCategory() {
  ideaForm.value = { id: null, label: '', emoji: IDEA_ICON_CHOICES[0] }
}

function startEditIdeaCategory(cat: { id: string; label: string; emoji: string }) {
  ideaForm.value = { id: cat.id, label: cat.label, emoji: cat.emoji }
}

async function saveIdeaCategory() {
  const form = ideaForm.value
  if (!form?.label.trim()) return

  const ok = form.id
    ? await updateIdeaCategory(form.id, form.label, form.emoji)
    : await addIdeaCategory(form.label, form.emoji)

  if (ok) {
    showToast(form.id ? 'Kategorie gespeichert' : `${form.emoji} ${form.label.trim()} angelegt`)
    ideaForm.value = null
  } else {
    showToast('Fehler beim Speichern')
  }
}

async function confirmIdeaDelete() {
  const form = pendingIdeaDelete.value
  if (!form?.id) return
  const ok = await removeIdeaCategory(form.id)
  showToast(ok ? 'Kategorie gelöscht' : 'Das geht nicht — mindestens eine Kategorie muss bleiben')
  pendingIdeaDelete.value = null
  if (ok) ideaForm.value = null
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

      <!-- Together Plus -->
      <div class="section-label section-gap">Abo</div>
      <div class="card plus-card" @click="router.push('/premium')">
        <span class="plus-badge" :class="{ 'plus-badge--active': isPremium }">{{ isPremium ? '💛' : '✨' }}</span>
        <div class="profile-text">
          <span class="profile-name">{{ isPremium ? 'Together Plus aktiv' : 'Together Plus' }}</span>
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

      <!-- Belegung: geteilte Ressourcen -->
      <div class="section-label section-gap">Belegung</div>
      <div class="card">
        <div class="field-label">Ressourcen</div>
        <p v-if="!resources.length" class="toggle-hint resource-empty">
          Noch nichts angelegt — z. B. Auto, E-Bike, Parkplatz oder „Gassi“.
        </p>
        <div v-else class="category-list">
          <div v-for="r in resources" :key="r.id" class="category-row">
            <span class="resource-icon">{{ r.emoji }}</span>
            <button class="resource-btn" type="button" @click="startEditResource(r)">
              <span class="category-name">{{ r.name }}</span>
              <span class="resource-count">
                {{ countBookings(r.id) }} {{ countBookings(r.id) === 1 ? 'Belegung' : 'Belegungen' }}
              </span>
            </button>
            <button
              class="remove-btn"
              type="button"
              aria-label="Entfernen"
              @click="pendingResourceDelete = { id: r.id, name: r.name, emoji: r.emoji }"
            >✕</button>
          </div>
        </div>

        <button v-if="!resourceForm" class="text-btn" type="button" @click="startNewResource">
          + Ressource hinzufügen
        </button>
        <template v-else>
          <input
            v-model="resourceForm.name"
            class="app-field cat-name-field"
            type="text"
            placeholder="z. B. Auto, Wohnmobil, Bohrmaschine …"
            @keyup.enter="saveResource"
          />
          <IconGridPicker v-model="resourceForm.emoji" :icons="RESOURCE_ICONS" :columns="7" />
          <div class="cat-form-actions">
            <button class="text-btn" type="button" @click="resourceForm = null">Abbrechen</button>
            <button
              class="btn-primary cat-save-btn"
              type="button"
              :disabled="!resourceForm.name.trim()"
              @click="saveResource"
            >{{ resourceForm.id ? 'Speichern' : 'Ressource anlegen' }}</button>
          </div>
        </template>
      </div>

      <!-- Planung: Ideen-Kategorien -->
      <div class="section-label section-gap">Ideen</div>
      <div class="card">
        <div class="field-label">Kategorien</div>
        <div class="category-list">
          <div v-for="c in ideaCategories" :key="c.id" class="category-row">
            <span class="resource-icon">{{ c.emoji }}</span>
            <button class="resource-btn" type="button" @click="startEditIdeaCategory(c)">
              <span class="category-name">{{ c.label }}</span>
              <span class="resource-count">
                {{ countIdeas(c.id) }} {{ countIdeas(c.id) === 1 ? 'Idee' : 'Ideen' }}
              </span>
            </button>
            <button
              class="remove-btn"
              type="button"
              aria-label="Entfernen"
              @click="pendingIdeaDelete = { id: c.id, label: c.label, emoji: c.emoji }"
            >✕</button>
          </div>
        </div>

        <button v-if="!ideaForm" class="text-btn" type="button" @click="startNewIdeaCategory">
          + Kategorie hinzufügen
        </button>
        <template v-else>
          <input
            v-model="ideaForm.label"
            class="app-field cat-name-field"
            type="text"
            placeholder="z. B. Konzerte, Wandern, Museen …"
            @keyup.enter="saveIdeaCategory"
          />
          <IconGridPicker v-model="ideaForm.emoji" :icons="IDEA_ICON_CHOICES" />
          <div class="cat-form-actions">
            <button class="text-btn" type="button" @click="ideaForm = null">Abbrechen</button>
            <button
              class="btn-primary cat-save-btn"
              type="button"
              :disabled="!ideaForm.label.trim()"
              @click="saveIdeaCategory"
            >{{ ideaForm.id ? 'Speichern' : 'Kategorie anlegen' }}</button>
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

    <BottomSheet
      :isOpen="!!pendingResourceDelete"
      title="Ressource löschen?"
      @close="pendingResourceDelete = null"
    >
      <p class="confirm-text">
        „{{ pendingResourceDelete?.name }}“ löschen?
        <template v-if="pendingResourceDelete?.id && countBookings(pendingResourceDelete.id)">
          Die {{ countBookings(pendingResourceDelete.id) }}
          {{ countBookings(pendingResourceDelete.id) === 1 ? 'zugehörige Belegung wird' : 'zugehörigen Belegungen werden' }}
          mit gelöscht.
        </template>
      </p>
      <div class="confirm-actions">
        <button class="text-btn confirm-cancel" type="button" @click="pendingResourceDelete = null">
          Abbrechen
        </button>
        <button class="btn-primary confirm-yes" type="button" @click="confirmResourceDelete">
          Ja, löschen
        </button>
      </div>
    </BottomSheet>

    <BottomSheet
      :isOpen="!!pendingIdeaDelete"
      title="Kategorie löschen?"
      @close="pendingIdeaDelete = null"
    >
      <p class="confirm-text">
        „{{ pendingIdeaDelete?.label }}“ löschen?
        <template v-if="pendingIdeaDelete?.id && countIdeas(pendingIdeaDelete.id)">
          Die {{ countIdeas(pendingIdeaDelete.id) }}
          {{ countIdeas(pendingIdeaDelete.id) === 1 ? 'zugehörige Idee bleibt' : 'zugehörigen Ideen bleiben' }}
          erhalten, {{ countIdeas(pendingIdeaDelete.id) === 1 ? 'wird' : 'werden' }} aber ohne Kategorie angezeigt.
        </template>
      </p>
      <div class="confirm-actions">
        <button class="text-btn confirm-cancel" type="button" @click="pendingIdeaDelete = null">
          Abbrechen
        </button>
        <button class="btn-primary confirm-yes" type="button" @click="confirmIdeaDelete">
          Ja, löschen
        </button>
      </div>
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

.resource-empty {
  margin: 0 0 4px;
}

.resource-icon {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  background: var(--surface-deep);
  font-size: 16px;
}

/* Zeile antippen = bearbeiten (Name + Icon), ✕ = löschen */
.resource-btn {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 1px;
  padding: 0;
  border: none;
  background: none;
  cursor: pointer;
}

.resource-count {
  font-size: 11.5px;
  font-weight: 700;
  color: var(--text-meta);
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

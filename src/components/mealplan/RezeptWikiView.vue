<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { Recipe } from '@/types'
import { usePersistedRef, DRAFT_TTL_MS } from '@/composables/usePersistedRef'
import { useMealPlan, type AssignRecipeInput } from '@/composables/useMealPlan'
import { useShopping } from '@/composables/useShopping'
import { useCouple } from '@/composables/useCouple'
import { useAuth } from '@/composables/useAuth'
import { showToast } from '@/composables/useToast'
import { showPaywall } from '@/composables/usePaywall'
import { primaryTagMeta, resolveRecipeCategories } from '@/utils/recipeTags'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import InitialChip from '@/components/ui/InitialChip.vue'
import RecipeDetailModal from './RecipeDetailModal.vue'
import AiRecipeSheet from './AiRecipeSheet.vue'

const props = defineProps<{
  coupleId: string | null
}>()

const coupleIdRef = computed(() => props.coupleId)
const {
  recipes, week, canCreateRecipe, suggestRecipes, createRecipe, updateRecipe,
  deleteRecipe, toggleRecipeLike, assignExistingRecipe,
} = useMealPlan(coupleIdRef)
const { activeListId, addItem: addShoppingItem } = useShopping(coupleIdRef)
const { couple } = useCouple()
const { user } = useAuth()

const currentUserId = computed(() => user.value?.uid ?? '')
const members = computed(() => couple.value?.memberIds ?? [])
const categories = computed(() => resolveRecipeCategories(couple.value))

const search = ref('')

// ── Filter: „Alle“ · ❤️ Favoriten · ⚡ Schnell · Kategorien ─────
const favActive = ref(false)
const schnellActive = ref(false)
const activeTags = ref<Set<string>>(new Set())

const QUICK_MAX_MINUTES = 30

const allActive = computed(() => !favActive.value && !schnellActive.value && activeTags.value.size === 0)

function resetFilters() {
  favActive.value = false
  schnellActive.value = false
  activeTags.value = new Set()
}

function toggleTagFilter(id: string) {
  const next = new Set(activeTags.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  activeTags.value = next
}

// Nur Kategorien anzeigen, die tatsächlich Rezepte haben (wie im Aufgaben-Pool).
const filterCategories = computed(() =>
  categories.value.filter((c) => recipes.value.some((r) => r.tags.includes(c.id)))
)

function likedByMe(r: Recipe): boolean {
  return r.likes.includes(currentUserId.value)
}

const filteredRecipes = computed(() => {
  const q = search.value.trim().toLowerCase()
  return recipes.value.filter((r) => {
    if (q && !r.title.toLowerCase().includes(q)) return false
    if (favActive.value && !likedByMe(r)) return false
    if (schnellActive.value && !(r.minutes != null && r.minutes <= QUICK_MAX_MINUTES)) return false
    if (activeTags.value.size > 0 && !r.tags.some((t) => activeTags.value.has(t))) return false
    return true
  })
})

// Foto-Hero = das erste Rezept der gefilterten Liste, der Rest kommt ins Grid.
const heroRecipe = computed(() => filteredRecipes.value[0] ?? null)
const gridRecipes = computed(() => filteredRecipes.value.slice(1))

// ── Optik-Helfer ───────────────────────────────────────────────
function photoGradient(r: Recipe): string {
  const color = primaryTagMeta(r.tags, categories.value).color
  return `linear-gradient(135deg, color-mix(in srgb, ${color} 34%, var(--surface)), color-mix(in srgb, ${color} 14%, var(--surface)))`
}

function heroEmoji(r: Recipe): string {
  return primaryTagMeta(r.tags, categories.value).emoji
}

function likersLabel(r: Recipe): string {
  if (r.likes.length === 0) return ''
  if (members.value.length > 0 && r.likes.length >= members.value.length) return 'beide mögen’s'
  const names = r.likes.map((uid) => couple.value?.memberNames[uid] ?? '?')
  return `${names.join(' & ')} mag’s`
}

const heroMeta = computed(() => {
  const r = heroRecipe.value
  if (!r) return ''
  const parts: string[] = []
  if (r.minutes) parts.push(`⏱️ ${r.minutes} Min`)
  const l = likersLabel(r)
  if (l) parts.push(l)
  return parts.join(' · ')
})

async function onToggleLike(r: Recipe) {
  const ok = await toggleRecipeLike(r.id, currentUserId.value)
  if (!ok) showToast('Fehler beim Speichern')
}

// ── Hero-CTA: In Wochenplan (Tagesauswahl) ─────────────────────
const showDayPicker = ref(false)
const planRecipe = ref<Recipe | null>(null)

const weekdayLabel = new Intl.DateTimeFormat('de-DE', { weekday: 'short', day: 'numeric', month: 'short' })

function openPlan(r: Recipe) {
  planRecipe.value = r
  showDayPicker.value = true
}

async function planOnDay(dateKeyValue: string) {
  if (!planRecipe.value) return
  const ok = await assignExistingRecipe(dateKeyValue, planRecipe.value.id)
  showToast(ok ? 'In den Wochenplan übernommen' : 'Fehler beim Einplanen')
  if (ok) showDayPicker.value = false
}

// ── Hero-CTA: Zutaten in die Einkaufsliste ─────────────────────
async function addIngredientsToShopping(r: Recipe) {
  if (r.ingredients.length === 0) {
    showToast('Dieses Rezept hat keine Zutaten')
    return
  }
  if (!activeListId.value) {
    showToast('Bitte zuerst eine Einkaufsliste anlegen')
    return
  }
  for (const ing of r.ingredients) {
    await addShoppingItem({ listId: activeListId.value, name: ing.name, amount: ing.amount, unit: ing.unit, merge: true })
  }
  showToast('Zutaten zur Einkaufsliste hinzugefügt')
}

// ── KI-Vorschlag → direkt in die Sammlung ─────────────────────
const showAiSheet = ref(false)

function openAiSheet() {
  if (!canCreateRecipe.value) {
    showPaywall('recipeCount')
    return
  }
  showAiSheet.value = true
}

async function saveAiRecipe(input: AssignRecipeInput) {
  if (!canCreateRecipe.value) {
    showAiSheet.value = false
    showPaywall('recipeCount')
    return false
  }
  return createRecipe(input)
}

function onAiSaved(success: boolean) {
  showAiSheet.value = false
  showToast(success ? 'Rezept gespeichert' : 'Fehler beim Speichern')
}

// ── Rezept anlegen/bearbeiten (ein Formular für beides) ───────
// Das lange manuelle Formular überlebt den Android-Kaltstart. formTags bleibt
// bewusst im Speicher (ein Set ist nicht JSON-persistierbar; Kategorien sind
// schnell nachgetippt). editingId sichert, dass „Speichern“ nach dem Restore
// aktualisiert statt zu duplizieren.
const showForm = usePersistedRef('rezept.showForm', false, { ttlMs: DRAFT_TTL_MS })
const editingId = usePersistedRef<string | null>('rezept.editId', null, { ttlMs: DRAFT_TTL_MS })
const formName = usePersistedRef('rezept.formName', '', { ttlMs: DRAFT_TTL_MS })
const formDuration = usePersistedRef('rezept.formDuration', '', { ttlMs: DRAFT_TTL_MS })
const formIngredients = usePersistedRef<string[]>('rezept.formIngredients', [''], { ttlMs: DRAFT_TTL_MS })
const formSteps = usePersistedRef<string[]>('rezept.formSteps', [''], { ttlMs: DRAFT_TTL_MS })
const formTags = ref<Set<string>>(new Set())

// Nach dem Kaltstart: war ein Rezept in Bearbeitung, das es nicht mehr gibt,
// das Formular schließen statt versehentlich ein neues anzulegen. Die Tags des
// bearbeiteten Rezepts wieder setzen (formTags ist nicht persistiert).
const stopFormRestore = watch(
  () => recipes.value.length,
  (len) => {
    if (len === 0) return
    if (editingId.value) {
      const rec = recipes.value.find((r) => r.id === editingId.value)
      if (rec) formTags.value = new Set(rec.tags)
      else if (showForm.value) { showForm.value = false; editingId.value = null }
    }
    stopFormRestore()
  },
  { immediate: true }
)

function toggleFormTag(id: string) {
  const next = new Set(formTags.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  formTags.value = next
}

function addIngredientRow() {
  formIngredients.value = [...formIngredients.value, '']
}
function removeIngredientRow(idx: number) {
  const next = formIngredients.value.filter((_, i) => i !== idx)
  formIngredients.value = next.length ? next : ['']
}
function addStepRow() {
  formSteps.value = [...formSteps.value, '']
}
function removeStepRow(idx: number) {
  const next = formSteps.value.filter((_, i) => i !== idx)
  formSteps.value = next.length ? next : ['']
}

function resetForm() {
  formName.value = ''
  formDuration.value = ''
  formIngredients.value = ['']
  formSteps.value = ['']
  formTags.value = new Set()
  editingId.value = null
  showForm.value = false
}

function openCreateForm() {
  if (!canCreateRecipe.value) {
    showPaywall('recipeCount')
    return
  }
  resetForm()
  showForm.value = true
}

function startEdit(recipe: Recipe) {
  formName.value = recipe.title
  formDuration.value = recipe.minutes != null ? String(recipe.minutes) : ''
  formIngredients.value = recipe.ingredients.length ? recipe.ingredients.map((i) => i.name) : ['']
  formSteps.value = recipe.steps.length ? [...recipe.steps] : ['']
  formTags.value = new Set(recipe.tags)
  editingId.value = recipe.id
  showDetail.value = false
  showForm.value = true
}

async function saveRecipe() {
  if (!formName.value.trim()) return
  const payload = {
    title: formName.value.trim(),
    minutes: formDuration.value.trim() ? parseInt(formDuration.value, 10) || null : null,
    tags: [...formTags.value],
    ingredients: formIngredients.value.map((v) => v.trim()).filter(Boolean).map((name) => ({ name })),
    steps: formSteps.value.map((v) => v.trim()).filter(Boolean),
    source: 'manual' as const,
  }
  const wasEditing = !!editingId.value
  const ok = wasEditing
    ? await updateRecipe(editingId.value!, payload)
    : await createRecipe(payload)
  showToast(ok ? (wasEditing ? 'Rezept aktualisiert' : 'Rezept gespeichert') : 'Fehler beim Speichern')
  if (ok) resetForm()
}

// ── Detail-Modal (gleiche Komponente wie im Essensplan) ───────
const detailRecipe = ref<Recipe | null>(null)
const showDetail = ref(false)

function openDetail(recipe: Recipe) {
  detailRecipe.value = recipe
  showDetail.value = true
}

async function handleDeleteRecipe(recipe: Recipe) {
  const ok = await deleteRecipe(recipe.id)
  showToast(ok ? 'Rezept gelöscht' : 'Fehler beim Löschen')
  if (ok) showDetail.value = false
}

defineExpose({ openCreateForm, showForm })
</script>

<template>
  <div class="wiki">
    <div class="wiki-scroll">
      <button class="suggest-card" type="button" @click="openAiSheet">
        <span class="suggest-icon">✨</span>
        <div class="suggest-text">
          <span class="suggest-title">Rezept vorschlagen lassen</span>
          <span class="suggest-sub">Direkt in eure Sammlung, mit eigener Kategorie</span>
        </div>
        <span class="suggest-chevron">›</span>
      </button>

      <input
        v-model="search"
        class="app-field search-field"
        type="text"
        placeholder="Rezept suchen …"
      />

      <div class="cat-row" data-hswipe-skip>
        <button
          type="button"
          class="cat-chip"
          :class="{ 'cat-chip--active': allActive }"
          @click="resetFilters"
        >Alle</button>
        <button
          type="button"
          class="cat-chip"
          :class="{ 'cat-chip--active': favActive }"
          @click="favActive = !favActive"
        ><span class="cat-chip__icon">❤️</span><span>Favoriten</span></button>
        <button
          type="button"
          class="cat-chip"
          :class="{ 'cat-chip--active': schnellActive }"
          @click="schnellActive = !schnellActive"
        ><span class="cat-chip__icon">⚡</span><span>Schnell</span></button>
        <button
          v-for="c in filterCategories"
          :key="c.id"
          type="button"
          class="cat-chip"
          :class="{ 'cat-chip--active': activeTags.has(c.id) }"
          :style="activeTags.has(c.id) ? { background: c.color, borderColor: c.color, color: '#fff' } : undefined"
          @click="toggleTagFilter(c.id)"
        >
          <span class="cat-chip__icon" aria-hidden="true">{{ c.emoji }}</span>
          <span>{{ c.label }}</span>
        </button>
      </div>

      <div v-if="filteredRecipes.length === 0" class="empty">
        {{ recipes.length === 0 ? 'Noch keine Rezepte gespeichert.' : 'Keine Rezepte gefunden.' }}
      </div>

      <template v-else>
        <!-- Foto-Hero -->
        <div class="hero-card">
          <div class="hero-photo" :style="{ background: photoGradient(heroRecipe!) }">
            <span class="hero-emoji">{{ heroEmoji(heroRecipe!) }}</span>
            <span class="foto-tag">📷 Foto hinzufügen</span>
            <button
              type="button"
              class="heart heart--hero"
              :class="{ 'heart--on': likedByMe(heroRecipe!) }"
              :aria-label="likedByMe(heroRecipe!) ? 'Herz entfernen' : 'Mit Herz markieren'"
              @click.stop="onToggleLike(heroRecipe!)"
            >{{ likedByMe(heroRecipe!) ? '❤️' : '🤍' }}</button>
          </div>
          <button class="hero-body" type="button" @click="openDetail(heroRecipe!)">
            <div class="hero-title-row">
              <span class="hero-title">{{ heroRecipe!.title }}</span>
              <span v-if="heroRecipe!.likes.length" class="hero-likers">
                <InitialChip v-for="uid in heroRecipe!.likes" :key="uid" :uid="uid" :couple="couple" :size="20" />
              </span>
            </div>
            <div v-if="heroMeta" class="hero-meta">{{ heroMeta }}</div>
          </button>
          <div class="hero-actions">
            <button class="hero-btn hero-btn--fill" type="button" @click="openPlan(heroRecipe!)">In Wochenplan</button>
            <button class="hero-btn hero-btn--soft" type="button" @click="addIngredientsToShopping(heroRecipe!)">🛒 Zutaten</button>
          </div>
        </div>

        <!-- Karten-Grid -->
        <div v-if="gridRecipes.length" class="rgrid">
          <div v-for="r in gridRecipes" :key="r.id" class="rcard">
            <div class="rphoto" :style="{ background: photoGradient(r) }">
              <span class="rphoto-emoji">{{ heroEmoji(r) }}</span>
              <button
                type="button"
                class="heart heart--card"
                :class="{ 'heart--on': likedByMe(r) }"
                :aria-label="likedByMe(r) ? 'Herz entfernen' : 'Mit Herz markieren'"
                @click.stop="onToggleLike(r)"
              >{{ likedByMe(r) ? '❤️' : '🤍' }}</button>
            </div>
            <button class="rbody" type="button" @click="openDetail(r)">
              <div class="rt">{{ r.title }}</div>
              <div class="rm">
                <span v-if="r.minutes">⏱️ {{ r.minutes }} Min</span>
                <span v-if="r.likes.length" class="rm-likers">
                  <InitialChip v-for="uid in r.likes" :key="uid" :uid="uid" :couple="couple" :size="18" />
                </span>
              </div>
            </button>
          </div>
        </div>
      </template>
    </div>

    <!-- Tagesauswahl für „In Wochenplan“ -->
    <BottomSheet :isOpen="showDayPicker" title="Für welchen Tag?" @close="showDayPicker = false">
      <p class="day-hint">„{{ planRecipe?.title }}“ in den Wochenplan übernehmen.</p>
      <div class="day-grid">
        <button
          v-for="day in week"
          :key="day.dateKey"
          type="button"
          class="day-btn"
          :class="{ 'day-btn--filled': day.recipe }"
          @click="planOnDay(day.dateKey)"
        >
          <span class="day-label">{{ weekdayLabel.format(day.date) }}</span>
          <span v-if="day.recipe" class="day-sub">{{ day.recipe.title }}</span>
          <span v-else class="day-sub day-sub--free">frei</span>
        </button>
      </div>
    </BottomSheet>

    <BottomSheet
      :isOpen="showForm"
      :title="editingId ? 'Rezept bearbeiten' : 'Neues Rezept'"
      @close="resetForm"
    >
      <input v-model="formName" class="app-field form-field" type="text" placeholder="Name" />
      <input v-model="formDuration" class="app-field form-field" type="number" inputmode="numeric" placeholder="Dauer (Min.)" />

      <div class="form-label">Zutaten</div>
      <div v-for="(_, idx) in formIngredients" :key="idx" class="form-row">
        <input v-model="formIngredients[idx]" class="app-field form-field form-field--row" type="text" placeholder="Zutat" />
        <button class="row-remove" type="button" @click="removeIngredientRow(idx)">–</button>
      </div>
      <button class="row-add" type="button" @click="addIngredientRow">+ Zutat hinzufügen</button>

      <div class="form-label">Schritte</div>
      <div v-for="(_, idx) in formSteps" :key="idx" class="form-row">
        <input v-model="formSteps[idx]" class="app-field form-field form-field--row" type="text" :placeholder="`Schritt ${idx + 1}`" />
        <button class="row-remove" type="button" @click="removeStepRow(idx)">–</button>
      </div>
      <button class="row-add" type="button" @click="addStepRow">+ Schritt hinzufügen</button>

      <div class="form-label">Kategorien</div>
      <p v-if="!categories.length" class="cat-empty">
        Noch keine Kategorien — anlegen könnt ihr sie in den Einstellungen.
      </p>
      <div v-else class="cat-badges">
        <button
          v-for="c in categories"
          :key="c.id"
          type="button"
          class="cat-badge"
          :class="{ 'cat-badge--active': formTags.has(c.id) }"
          :style="formTags.has(c.id) ? { background: c.color, borderColor: c.color } : undefined"
          @click="toggleFormTag(c.id)"
        >
          {{ c.emoji }} {{ c.label }}
        </button>
      </div>

      <button class="btn-primary save-btn" :disabled="!formName.trim()" @click="saveRecipe">
        {{ editingId ? 'Änderungen speichern' : 'Rezept speichern' }}
      </button>
    </BottomSheet>

    <AiRecipeSheet
      :isOpen="showAiSheet"
      mode="library"
      :suggest="suggestRecipes"
      :categories="categories"
      :save="saveAiRecipe"
      @close="showAiSheet = false"
      @assigned="onAiSaved"
    />

    <RecipeDetailModal
      :isOpen="showDetail"
      :recipe="detailRecipe"
      manageable
      @close="showDetail = false"
      @edit="startEdit"
      @delete="handleDeleteRecipe"
    />
  </div>
</template>

<style scoped>
.wiki {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.wiki-scroll {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  touch-action: pan-y;
  width: 100%;
  max-width: 880px;
  margin: 0 auto;
  padding: 0 var(--screen-pad) 100px;
}

/* KI-Look angelehnt an Gemini — identisch zur Karte im Essensplan. */
.suggest-card {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 14px 16px;
  margin-bottom: 14px;
  background: linear-gradient(120deg, #4285f4 0%, #9b72cb 35%, #d96570 65%, #f6b73c 100%);
  background-size: 220% 220%;
  border: none;
  border-radius: var(--radius-card-lg);
  cursor: pointer;
  text-align: left;
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.28) inset,
    0 6px 20px -4px rgba(155, 114, 203, 0.55),
    0 0 22px rgba(66, 133, 244, 0.35);
  animation: suggestGradientShift 6s ease-in-out infinite;
  transition: transform 0.12s ease;
}

.suggest-card:active {
  transform: scale(0.98);
}

@keyframes suggestGradientShift {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}

.suggest-icon {
  flex-shrink: 0;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  box-shadow: 0 0 12px rgba(255, 255, 255, 0.55);
}

.suggest-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.suggest-title {
  font-size: 14px;
  font-weight: 700;
  color: #fff;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.18);
}

.suggest-sub {
  font-size: 11.5px;
  color: rgba(255, 255, 255, 0.88);
}

.suggest-chevron {
  font-size: 20px;
  color: rgba(255, 255, 255, 0.85);
  flex-shrink: 0;
}

.search-field {
  margin-bottom: 10px;
}

/* Eine Zeile, horizontal scrollbar — volle Chip-Höhe reserviert. */
.cat-row {
  display: flex;
  flex-wrap: nowrap;
  gap: 8px;
  overflow-x: auto;
  overflow-y: visible;
  min-height: 52px;
  align-items: center;
  padding-bottom: 2px;
  margin-bottom: 14px;
}

.cat-chip {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-family: var(--font-body);
  font-size: 14px;
  font-weight: 700;
  padding: 9px 15px;
  border-radius: 100px;
  border: 1px solid var(--border-softer);
  background: var(--surface);
  color: var(--text-meta);
  cursor: pointer;
  white-space: nowrap;
  box-shadow: var(--shadow-card);
}

.cat-chip__icon {
  font-size: 17px;
  line-height: 1;
}

.cat-chip--active {
  border-color: var(--accent);
  background: var(--accent-tint);
  color: var(--text);
}

/* ── Foto-Hero ─────────────────────────────────────────────── */
.hero-card {
  background: var(--surface);
  border: 1px solid var(--border-softer);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-card);
  padding: 14px;
  margin-bottom: 14px;
}

.hero-photo {
  position: relative;
  height: 150px;
  border-radius: 18px;
  display: grid;
  place-items: center;
  margin-bottom: 13px;
  overflow: hidden;
}

.hero-emoji {
  font-size: 54px;
  line-height: 1;
}

.foto-tag {
  position: absolute;
  left: 10px;
  bottom: 10px;
  font-size: 11px;
  font-weight: 800;
  color: rgba(255, 255, 255, 0.92);
  background: rgba(0, 0, 0, 0.28);
  backdrop-filter: blur(4px);
  border-radius: 8px;
  padding: 4px 9px;
}

.heart {
  position: absolute;
  display: grid;
  place-items: center;
  border: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.85);
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(60, 45, 30, 0.18);
  transition: transform 0.12s var(--ease-overshoot);
}

.heart:active {
  transform: scale(0.88);
}

.heart--on {
  transform: scale(1.05);
}

.heart--hero {
  top: 10px;
  right: 10px;
  width: 36px;
  height: 36px;
  font-size: 17px;
}

.heart--card {
  top: 8px;
  right: 8px;
  width: 30px;
  height: 30px;
  font-size: 14px;
}

.hero-body {
  display: block;
  width: 100%;
  text-align: left;
  border: none;
  background: none;
  padding: 0;
  cursor: pointer;
}

.hero-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.hero-title {
  font-family: var(--font-headline);
  font-size: 19px;
  font-weight: 700;
  color: var(--text);
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.hero-likers {
  display: inline-flex;
  gap: 3px;
  flex-shrink: 0;
}

.hero-meta {
  margin-top: 4px;
  font-size: 12.5px;
  font-weight: 700;
  color: var(--text-secondary);
}

.hero-actions {
  display: flex;
  gap: 9px;
  margin-top: 13px;
}

.hero-btn {
  flex: 1;
  min-height: 46px;
  border: none;
  border-radius: 15px;
  font-family: var(--font-body);
  font-size: 14.5px;
  font-weight: 800;
  cursor: pointer;
  transition: transform 0.12s var(--ease-overshoot);
}

.hero-btn:active {
  transform: scale(0.97);
}

.hero-btn--fill {
  background: var(--food);
  color: #fff;
}

.hero-btn--soft {
  background: var(--food-tint);
  color: var(--food);
}

/* ── Karten-Grid ───────────────────────────────────────────── */
.rgrid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.rcard {
  min-width: 0;
  background: var(--surface);
  border: 1px solid var(--border-softer);
  border-radius: 20px;
  overflow: hidden;
  box-shadow: var(--shadow-card);
}

.rphoto {
  position: relative;
  height: 108px;
  display: grid;
  place-items: center;
}

.rphoto-emoji {
  font-size: 40px;
  line-height: 1;
}

.rbody {
  display: block;
  width: 100%;
  text-align: left;
  border: none;
  background: none;
  padding: 11px 12px 13px;
  cursor: pointer;
}

.rt {
  font-size: 14.5px;
  font-weight: 800;
  line-height: 1.2;
  color: var(--text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rm {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 4px;
  font-size: 12.5px;
  font-weight: 700;
  color: var(--text-meta);
}

.rm-likers {
  display: inline-flex;
  gap: 3px;
  margin-left: auto;
  flex-shrink: 0;
}

/* ── Tagesauswahl ──────────────────────────────────────────── */
.day-hint {
  margin: 0 0 12px;
  font-size: 13px;
  font-weight: 700;
  color: var(--text-secondary);
}

.day-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 8px;
}

.day-btn {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 12px;
  border: 1px solid var(--border-soft);
  border-radius: 14px;
  background: var(--surface);
  cursor: pointer;
  text-align: left;
  font-family: var(--font-body);
  transition: transform 0.12s var(--ease-overshoot), border-color 0.15s var(--ease-standard);
}

.day-btn:active {
  transform: scale(0.97);
}

.day-btn--filled {
  border-color: color-mix(in srgb, var(--food) 40%, transparent);
  background: var(--food-tint);
}

.day-label {
  font-size: 13px;
  font-weight: 800;
  color: var(--text);
}

.day-sub {
  font-size: 11.5px;
  font-weight: 700;
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.day-sub--free {
  color: var(--text-faint);
}

/* ── Formular (unverändert) ────────────────────────────────── */
.cat-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.cat-badge {
  padding: 6px 11px;
  border-radius: 20px;
  font-family: var(--font-body);
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  background: var(--surface);
  color: #6b6255;
  border: 1px solid var(--border-softer);
  white-space: nowrap;
}

.cat-badge--active {
  color: #fff;
}

.cat-empty {
  margin: 0;
  font-size: 12px;
  color: var(--text-faint);
  line-height: 1.5;
}

.form-field {
  margin-bottom: 8px;
}

.form-label {
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  color: var(--text-meta);
  margin: 4px 0 8px;
}

.form-row {
  display: flex;
  gap: 6px;
  margin-bottom: 8px;
}

.form-field--row {
  flex: 1;
  margin-bottom: 0;
}

.row-remove {
  width: 34px;
  height: 38px;
  flex-shrink: 0;
  border-radius: 9px;
  background: var(--surface-deep);
  border: none;
  color: #b09a86;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
}

.row-add {
  display: block;
  width: 100%;
  text-align: center;
  background: none;
  border: none;
  color: oklch(0.55 0.13 80);
  font-family: var(--font-body);
  font-size: 11.5px;
  font-weight: 700;
  cursor: pointer;
  padding: 4px 0 8px;
}

.save-btn {
  margin-top: 6px;
}

.empty {
  text-align: center;
  padding: 40px 20px;
  color: var(--text-faint);
  font-size: 13.5px;
  line-height: 1.5;
}
</style>

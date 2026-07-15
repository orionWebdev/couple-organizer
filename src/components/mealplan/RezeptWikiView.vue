<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Recipe } from '@/types'
import { useMealPlan, type AssignRecipeInput } from '@/composables/useMealPlan'
import { useCouple } from '@/composables/useCouple'
import { showToast } from '@/composables/useToast'
import { showPaywall } from '@/composables/usePaywall'
import { primaryTagMeta, recipeCategoryDef, resolveRecipeCategories } from '@/utils/recipeTags'
import RecipeDetailModal from './RecipeDetailModal.vue'
import AiRecipeSheet from './AiRecipeSheet.vue'

const props = defineProps<{
  coupleId: string | null
}>()

const coupleIdRef = computed(() => props.coupleId)
const {
  recipes, canCreateRecipe, suggestRecipes, createRecipe, updateRecipe, deleteRecipe,
} = useMealPlan(coupleIdRef)
const { couple } = useCouple()

const categories = computed(() => resolveRecipeCategories(couple.value))

const search = ref('')
const activeTags = ref<Set<string>>(new Set())

// Wie im Aufgaben-Pool: eine Zeile, horizontal scrollbar, führendes "Alle".
// Kategorien ohne Rezepte bleiben draußen — die Zeile soll die Sammlung
// spiegeln, nicht die Kategorieliste.
const filterCategories = computed(() =>
  categories.value.filter((c) => recipes.value.some((r) => r.tags.includes(c.id)))
)

function toggleTagFilter(id: string) {
  const next = new Set(activeTags.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  activeTags.value = next
}

const filteredRecipes = computed(() => {
  const q = search.value.trim().toLowerCase()
  return recipes.value.filter((r) => {
    const matchesSearch = !q || r.title.toLowerCase().includes(q)
    const matchesTags = activeTags.value.size === 0 || r.tags.some((t) => activeTags.value.has(t))
    return matchesSearch && matchesTags
  })
})

// ── KI-Vorschlag → direkt in die Sammlung ─────────────────────
// Gleiche Sheet-Komponente wie im Essensplan, aber im Bibliotheksmodus: kein
// Tagesbezug, dafür wählt man beim Übernehmen die Kategorien selbst.
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
const showForm = ref(false)
const editingId = ref<string | null>(null)
const formName = ref('')
const formDuration = ref('')
const formIngredients = ref<string[]>([''])
const formSteps = ref<string[]>([''])
const formTags = ref<Set<string>>(new Set())

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
  // Nur neue Rezepte sind limitiert — bestehende bleiben immer bearbeitbar
  // (startEdit geht bewusst nicht durch diese Prüfung).
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

// Der "Rezept hinzufügen"-Button lebt in EinkaufenView (außerhalb der
// Tab-Transition) — ein fixiertes Element hier drin würde während des
// tab-fade-Übergangs kurzzeitig relativ zum transformierten .wiki statt
// zum Viewport positioniert (transform erzeugt einen Containing Block
// für position:fixed-Nachfahren), was als sichtbares Herunterrutschen
// beim Laden auffiel.
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
          :class="{ 'cat-chip--active': activeTags.size === 0 }"
          @click="activeTags = new Set()"
        >Alle</button>
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

      <div v-if="showForm" class="form-card">
        <div class="form-card-head">
          <div class="form-title">{{ editingId ? 'Rezept bearbeiten' : 'Neues Rezept' }}</div>
          <button class="form-cancel" type="button" @click="resetForm">Abbrechen</button>
        </div>
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
      </div>

      <div v-if="filteredRecipes.length === 0" class="empty">
        {{ recipes.length === 0 ? 'Noch keine Rezepte gespeichert.' : 'Keine Rezepte gefunden.' }}
      </div>
      <div v-else class="card-grid">
        <button
          v-for="r in filteredRecipes"
          :key="r.id"
          type="button"
          class="recipe-card"
          @click="openDetail(r)"
        >
          <span class="card-icon" :style="{ background: primaryTagMeta(r.tags, categories).color }">{{ primaryTagMeta(r.tags, categories).emoji }}</span>
          <div class="card-body">
            <div class="card-name">{{ r.title }}</div>
            <div class="card-meta">
              <span v-if="r.minutes" class="card-time">⏱ {{ r.minutes }} Min</span>
              <span v-if="r.tags.length" class="card-tags">
                <template v-for="t in r.tags.slice(0, 3)" :key="t">
                  <span
                    v-if="recipeCategoryDef(t, categories)"
                    class="tag-dot"
                    :style="{ background: recipeCategoryDef(t, categories)!.color }"
                  >{{ recipeCategoryDef(t, categories)!.emoji }}</span>
                </template>
              </span>
            </div>
          </div>
          <span class="card-chevron">›</span>
        </button>
      </div>
    </div>

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

/* Responsiver Container, damit das Karten-Grid auf breiten Screens nicht
   randlos aus dem Layout läuft (siehe .recipe-card min-width Fix unten). */
.wiki-scroll {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  /* Nur vertikal scrollen — horizontale Gesten gehören dem Tab-Swipe. */
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

/* Eine Zeile, horizontal scrollbar — wie die Raum-Chips im Aufgaben-Pool.
   data-hswipe-skip im Template hält den Tab-Swipe von dieser Zeile fern. */
.cat-row {
  display: flex;
  gap: 8px;
  overflow-x: auto;
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

/* Nur der "Alle"-Chip trägt den Bereichs-Akzent; die Kategorie-Chips färben
   sich aktiv in ihrer eigenen Farbe (Inline-Style im Template). */
.cat-chip--active {
  border-color: var(--accent);
  background: var(--accent-tint);
  color: var(--text);
}

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

.form-card {
  background: var(--surface);
  border-radius: 18px;
  padding: 14px;
  margin-bottom: 14px;
  box-shadow: var(--shadow-card);
  border: 1px solid var(--border-softer);
}

.form-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 10px;
}

.form-title {
  font-size: 13.5px;
  font-weight: 700;
  color: var(--text);
}

.form-cancel {
  flex-shrink: 0;
  background: none;
  border: none;
  color: var(--text-faint);
  font-family: var(--font-body);
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  padding: 0;
}

.form-cancel:active {
  color: var(--text);
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

/* Karten untereinander (Spalte), keine Grid-Kacheln — min-width:0 bleibt
   als Absicherung gegen unkürzbaren Button-Inhalt, der die Karte sonst
   über den Container hinaus aufziehen könnte. */
.card-grid {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.recipe-card {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  width: 100%;
  background: var(--surface);
  border-radius: 16px;
  padding: 12px 14px;
  box-shadow: var(--shadow-card);
  border: 1px solid var(--border-softer);
  cursor: pointer;
  text-align: left;
}

.card-icon {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  border-radius: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
}

.card-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.card-name {
  font-size: 14px;
  font-weight: 700;
  color: var(--text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.card-time {
  font-size: 11px;
  color: var(--text-meta);
  flex-shrink: 0;
}

.card-tags {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

.tag-dot {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 9px;
  flex-shrink: 0;
}

.card-chevron {
  flex-shrink: 0;
  font-size: 20px;
  color: var(--text-faint);
}
</style>

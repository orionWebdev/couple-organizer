<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Recipe } from '@/types'
import { useMealPlan } from '@/composables/useMealPlan'
import { showToast } from '@/composables/useToast'
import { RECIPE_TAGS, primaryTagMeta, recipeTagDef, type RecipeTagId } from '@/utils/recipeTags'
import RecipeDetailModal from './RecipeDetailModal.vue'

const props = defineProps<{
  coupleId: string | null
}>()

const coupleIdRef = computed(() => props.coupleId)
const { recipes, createRecipe, updateRecipe, deleteRecipe } = useMealPlan(coupleIdRef)

const search = ref('')
const activeTags = ref<Set<RecipeTagId>>(new Set())

function toggleTagFilter(tag: RecipeTagId) {
  const next = new Set(activeTags.value)
  if (next.has(tag)) next.delete(tag)
  else next.add(tag)
  activeTags.value = next
}

const filteredRecipes = computed(() => {
  const q = search.value.trim().toLowerCase()
  return recipes.value.filter((r) => {
    const matchesSearch = !q || r.title.toLowerCase().includes(q)
    const matchesTags = activeTags.value.size === 0 || r.tags.some((t) => activeTags.value.has(t as RecipeTagId))
    return matchesSearch && matchesTags
  })
})

// ── Rezept anlegen/bearbeiten (ein Formular für beides) ───────
const showForm = ref(false)
const editingId = ref<string | null>(null)
const formName = ref('')
const formDuration = ref('')
const formIngredients = ref<string[]>([''])
const formSteps = ref<string[]>([''])
const formTags = ref<Set<RecipeTagId>>(new Set())

function toggleFormTag(tag: RecipeTagId) {
  const next = new Set(formTags.value)
  if (next.has(tag)) next.delete(tag)
  else next.add(tag)
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
  resetForm()
  showForm.value = true
}

function startEdit(recipe: Recipe) {
  formName.value = recipe.title
  formDuration.value = recipe.minutes != null ? String(recipe.minutes) : ''
  formIngredients.value = recipe.ingredients.length ? recipe.ingredients.map((i) => i.name) : ['']
  formSteps.value = recipe.steps.length ? [...recipe.steps] : ['']
  formTags.value = new Set(recipe.tags as RecipeTagId[])
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
      <input
        v-model="search"
        class="app-field search-field"
        type="text"
        placeholder="Rezept suchen …"
      />

      <div class="filter-row">
        <button
          v-for="tag in RECIPE_TAGS"
          :key="tag.id"
          type="button"
          class="filter-badge"
          :class="{ 'filter-badge--active': activeTags.has(tag.id) }"
          :style="activeTags.has(tag.id) ? { background: tag.color, borderColor: tag.color } : undefined"
          @click="toggleTagFilter(tag.id)"
        >
          {{ tag.emoji }} {{ tag.label }}
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
        <div class="filter-row">
          <button
            v-for="tag in RECIPE_TAGS"
            :key="tag.id"
            type="button"
            class="filter-badge"
            :class="{ 'filter-badge--active': formTags.has(tag.id) }"
            :style="formTags.has(tag.id) ? { background: tag.color, borderColor: tag.color } : undefined"
            @click="toggleFormTag(tag.id)"
          >
            {{ tag.emoji }} {{ tag.label }}
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
          <span class="card-icon" :style="{ background: primaryTagMeta(r.tags).color }">{{ primaryTagMeta(r.tags).emoji }}</span>
          <div class="card-body">
            <div class="card-name">{{ r.title }}</div>
            <div class="card-meta">
              <span v-if="r.minutes" class="card-time">⏱ {{ r.minutes }} Min</span>
              <span v-if="r.tags.length" class="card-tags">
                <span
                  v-for="t in r.tags.slice(0, 3)"
                  :key="t"
                  class="tag-dot"
                  :style="{ background: recipeTagDef(t)?.color }"
                >{{ recipeTagDef(t)?.emoji }}</span>
              </span>
            </div>
          </div>
          <span class="card-chevron">›</span>
        </button>
      </div>
    </div>

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

.search-field {
  margin-bottom: 10px;
}

.filter-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 12px;
}

.filter-badge {
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

.filter-badge--active {
  color: #fff;
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

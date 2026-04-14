<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { IonIcon, IonSpinner } from '@ionic/vue'
import { addOutline } from 'ionicons/icons'
import { useRecipes } from '@/composables/useRecipes'
import { useRecipeCategories } from '@/composables/useRecipeCategories'
import { useShopping } from '@/composables/useShopping'
import type { Recipe, RecipeCategory, RecipeCategoryColor } from '@/types'
import AppSheetModal from '@/components/ui/AppSheetModal.vue'
import RecipeCategoryCard from './RecipeCategoryCard.vue'
import RecipeCard from './RecipeCard.vue'
import RecipeDetailModal from './RecipeDetailModal.vue'
import RecipeFormModal from './RecipeFormModal.vue'
import RecipeCategoryFormModal from './RecipeCategoryFormModal.vue'
import { useActionHub } from '@/composables/useActionHub'

const props = defineProps<{ coupleId: string }>()

const { pendingAction, consumePending } = useActionHub()

const coupleIdRef = computed<string | null>(() => props.coupleId)
const { recipes, loading, addRecipe, updateRecipe, deleteRecipe, toggleFavorite } = useRecipes(coupleIdRef)
const { categories, addCategory, updateCategory, deleteCategory } = useRecipeCategories(coupleIdRef)
const { lists, generateItemsFromIngredients } = useShopping(coupleIdRef)

// ── Navigation state ─────────────────────────────────────────
type Screen = 'categories' | 'all' | 'category-detail'
const screen = ref<Screen>('categories')
const selectedCategoryId = ref<string | null>(null)

// ── Modals ────────────────────────────────────────────────────
const showRecipeForm = ref(false)
const editingRecipe = ref<Readonly<Recipe> | null>(null)

const showCategoryForm = ref(false)
const editingCategory = ref<Readonly<RecipeCategory> | null>(null)

const showDetail = ref(false)
const detailRecipe = ref<Readonly<Recipe> | null>(null)

const showManageCategories = ref(false)

// Add-to-shopping-list from recipe detail
const showShoppingPicker = ref(false)
const selectedShoppingListId = ref('')
const shoppingMsg = ref<string | null>(null)
const shoppingErr = ref<string | null>(null)
const shoppingBusy = ref(false)

// ── Derived data ──────────────────────────────────────────────
const recipesByCategory = computed(() => {
  const map = new Map<string, Recipe[]>()
  for (const cat of categories.value) map.set(cat.id, [])
  for (const recipe of recipes.value) {
    for (const catId of (recipe.categories ?? [])) {
      if (!map.has(catId)) map.set(catId, [])
      map.get(catId)!.push(recipe)
    }
  }
  return map
})

const uncategorizedRecipes = computed(() =>
  recipes.value.filter((r) => !r.categories || r.categories.length === 0)
)

const displayedRecipes = computed(() => {
  if (screen.value === 'all') return recipes.value
  if (screen.value === 'category-detail' && selectedCategoryId.value) {
    return recipesByCategory.value.get(selectedCategoryId.value) ?? []
  }
  return []
})

const selectedCategory = computed(() =>
  categories.value.find((c) => c.id === selectedCategoryId.value) ?? null
)

const COLOR_ACCENT: Record<RecipeCategoryColor, string> = {
  blue: '#93c5fd', green: '#86efac', yellow: '#fde047', red: '#fca5a5',
  purple: '#d8b4fe', orange: '#fdba74', pink: '#f9a8d4', teal: '#5eead4',
}

// ── Navigation ────────────────────────────────────────────────
function openCategory(id: string) {
  selectedCategoryId.value = id
  screen.value = 'category-detail'
}

function goBack() {
  screen.value = 'categories'
  selectedCategoryId.value = null
}

// ── Recipe actions ────────────────────────────────────────────
function openNewRecipe() {
  editingRecipe.value = null
  showRecipeForm.value = true
}

watch(pendingAction, (a) => {
  if (a === 'recipe') {
    consumePending('recipe')
    openNewRecipe()
  }
}, { immediate: true })

function openEditRecipe(recipe: Readonly<Recipe>) {
  editingRecipe.value = recipe
  showDetail.value = false
  showRecipeForm.value = true
}

function openRecipeDetail(recipe: Readonly<Recipe>) {
  detailRecipe.value = recipe
  showDetail.value = true
}

async function handleRecipeSubmit(payload: Parameters<typeof addRecipe>[0]) {
  if (editingRecipe.value) {
    await updateRecipe(editingRecipe.value.id, payload)
  } else {
    await addRecipe(payload)
  }
  showRecipeForm.value = false
  editingRecipe.value = null
}

async function handleDeleteRecipe() {
  if (!detailRecipe.value) return
  await deleteRecipe(detailRecipe.value.id)
  showDetail.value = false
  detailRecipe.value = null
}

async function handleToggleFavorite() {
  if (!detailRecipe.value) return
  await toggleFavorite(detailRecipe.value.id)
}

function handleToggleFavoriteCard(recipe: Readonly<Recipe>) {
  toggleFavorite(recipe.id)
}

// ── Category actions ──────────────────────────────────────────
function openNewCategory() {
  editingCategory.value = null
  showCategoryForm.value = true
}

function openEditCategory(cat: Readonly<RecipeCategory>) {
  editingCategory.value = cat
  showCategoryForm.value = true
}

async function handleDeleteCategory(id: string) {
  if (screen.value === 'category-detail' && selectedCategoryId.value === id) {
    goBack()
  }
  await deleteCategory(id)
}

async function handleCategorySubmit(payload: { name: string; color: RecipeCategoryColor; icon: string }) {
  if (editingCategory.value) {
    await updateCategory(editingCategory.value.id, payload)
  } else {
    await addCategory(payload)
  }
  showCategoryForm.value = false
  editingCategory.value = null
}

// ── Add to shopping list ──────────────────────────────────────
function openShoppingPicker() {
  shoppingMsg.value = null
  shoppingErr.value = null
  if (lists.value.length > 0) selectedShoppingListId.value = lists.value[0].id
  showShoppingPicker.value = true
}

async function handleAddToShoppingList() {
  if (!detailRecipe.value || !selectedShoppingListId.value) return
  shoppingBusy.value = true
  shoppingMsg.value = null
  shoppingErr.value = null
  try {
    const result = await generateItemsFromIngredients(
      selectedShoppingListId.value,
      detailRecipe.value.ingredients as any,
      `recipe_${detailRecipe.value.id}`
    )
    shoppingMsg.value = `${result.added} Zutat${result.added !== 1 ? 'en' : ''} hinzugefügt${result.skipped > 0 ? `, ${result.skipped} bereits vorhanden` : ''}.`
  } catch (err: any) {
    shoppingErr.value = err.message
  } finally {
    shoppingBusy.value = false
  }
}
</script>

<template>
  <div class="recipe-manager">

    <!-- ── Loading ──────────────────────────────────────────── -->
    <div v-if="loading" class="flex justify-center py-12">
      <ion-spinner name="crescent" color="primary" />
    </div>

    <template v-else>

      <!-- ── CATEGORIES SCREEN ─────────────────────────────── -->
      <div v-if="screen === 'categories'" class="screen">
        <!-- Toolbar -->
        <div class="screen-toolbar">
          <div>
            <p class="screen-subtitle">{{ recipes.length }} {{ recipes.length === 1 ? 'Rezept' : 'Rezepte' }}</p>
          </div>
          <div class="toolbar-actions">
            <button class="toolbar-btn" @click="screen = 'all'">Alle</button>
            <button class="toolbar-btn" title="Kategorien verwalten" @click="showManageCategories = true">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/>
              </svg>
              Kategorien
            </button>
            <button class="toolbar-add-btn" @click="openNewRecipe">
              <ion-icon :icon="addOutline" />
              Rezept
            </button>
          </div>
        </div>

        <!-- Empty state -->
        <div v-if="categories.length === 0 && recipes.length === 0" class="empty-state">
          <div class="empty-icon">🍝</div>
          <p class="empty-title">Noch keine Rezepte</p>
          <p class="empty-hint">Tippe oben auf „Rezept", um dein erstes zu erstellen.</p>
        </div>

        <!-- Category grid -->
        <div v-if="categories.length > 0" class="cat-grid">
          <RecipeCategoryCard
            v-for="cat in categories"
            :key="cat.id"
            :category="cat"
            :recipes="recipesByCategory.get(cat.id) ?? []"
            @tap="openCategory(cat.id)"
            @edit="openEditCategory(cat)"
            @delete="handleDeleteCategory(cat.id)"
          />
        </div>

        <!-- Uncategorized section -->
        <template v-if="uncategorizedRecipes.length > 0">
          <h3 class="section-label">Ohne Kategorie</h3>
          <div class="recipe-list">
            <RecipeCard
              v-for="recipe in uncategorizedRecipes"
              :key="recipe.id"
              :recipe="recipe"
              :categories="categories"
              @tap="openRecipeDetail(recipe)"
              @toggle-favorite="handleToggleFavoriteCard(recipe)"
            />
          </div>
        </template>

        <!-- No categories yet hint -->
        <div v-if="categories.length === 0 && recipes.length > 0" class="no-cats-hint">
          <p>Erstelle Kategorien, um deine Rezepte zu organisieren.</p>
          <button class="hint-create-btn" @click="openNewCategory">Kategorie erstellen</button>
        </div>
      </div>

      <!-- ── ALL RECIPES SCREEN ────────────────────────────── -->
      <div v-else-if="screen === 'all'" class="screen">
        <div class="screen-toolbar">
          <button class="back-btn" @click="screen = 'categories'">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
            </svg>
            Zurück
          </button>
          <div class="toolbar-actions">
            <span class="screen-count">{{ recipes.length }}</span>
            <button class="toolbar-add-btn" @click="openNewRecipe">
              <ion-icon :icon="addOutline" />
              Rezept
            </button>
          </div>
        </div>
        <div v-if="recipes.length === 0" class="empty-state">
          <div class="empty-icon">📋</div>
          <p class="empty-title">Noch keine Rezepte</p>
        </div>
        <div v-else class="recipe-list">
          <RecipeCard
            v-for="recipe in recipes"
            :key="recipe.id"
            :recipe="recipe"
            :categories="categories"
            @tap="openRecipeDetail(recipe)"
            @toggle-favorite="handleToggleFavoriteCard(recipe)"
          />
        </div>
      </div>

      <!-- ── CATEGORY DETAIL SCREEN ────────────────────────── -->
      <div v-else-if="screen === 'category-detail' && selectedCategory" class="screen">
        <div class="screen-toolbar">
          <button class="back-btn" @click="goBack">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
            </svg>
            Zurück
          </button>
          <div class="cat-detail-badge" :style="{ color: COLOR_ACCENT[selectedCategory.color] }">
            <span v-if="selectedCategory.icon">{{ selectedCategory.icon }}</span>
            {{ selectedCategory.name }}
          </div>
          <div class="toolbar-actions">
            <span class="screen-count">{{ displayedRecipes.length }}</span>
            <button class="toolbar-add-btn" @click="openNewRecipe">
              <ion-icon :icon="addOutline" />
              Rezept
            </button>
          </div>
        </div>

        <div v-if="displayedRecipes.length === 0" class="empty-state">
          <div class="empty-icon">{{ selectedCategory.icon || '📁' }}</div>
          <p class="empty-title">Noch keine Rezepte in dieser Kategorie</p>
          <p class="empty-hint">Weise Rezepten beim Erstellen diese Kategorie zu.</p>
        </div>
        <div v-else class="recipe-list">
          <RecipeCard
            v-for="recipe in displayedRecipes"
            :key="recipe.id"
            :recipe="recipe"
            :categories="categories"
            @tap="openRecipeDetail(recipe)"
            @toggle-favorite="handleToggleFavoriteCard(recipe)"
          />
        </div>
      </div>

    </template>

    <!-- ── Recipe detail modal ────────────────────────────────── -->
    <RecipeDetailModal
      :is-open="showDetail"
      :recipe="detailRecipe"
      :categories="categories"
      @close="showDetail = false"
      @edit="openEditRecipe(detailRecipe!)"
      @delete="handleDeleteRecipe"
      @toggle-favorite="handleToggleFavorite"
      @add-to-meal-plan="() => {}"
      @add-to-shopping-list="openShoppingPicker"
    />

    <!-- ── Recipe form modal ──────────────────────────────────── -->
    <RecipeFormModal
      :is-open="showRecipeForm"
      :recipe="editingRecipe"
      :categories="categories"
      @close="showRecipeForm = false"
      @submit="handleRecipeSubmit"
    />

    <!-- ── Category form modal ────────────────────────────────── -->
    <RecipeCategoryFormModal
      :is-open="showCategoryForm"
      :category="editingCategory"
      @close="showCategoryForm = false"
      @submit="handleCategorySubmit"
    />

    <!-- ── Manage categories sheet ────────────────────────────── -->
    <AppSheetModal
      :is-open="showManageCategories"
      title="Kategorien verwalten"
      :breakpoints="[0, 0.72, 0.92]"
      :initial-breakpoint="0.72"
      close-label="Fertig"
      @close="showManageCategories = false"
    >
      <div class="manage-cats">
        <div v-if="categories.length === 0" class="manage-cats-empty">
          <p>Noch keine Kategorien vorhanden.</p>
        </div>
        <div v-else class="manage-cat-list">
          <div
            v-for="cat in categories"
            :key="cat.id"
            class="manage-cat-row"
          >
            <div class="manage-cat-info">
              <span v-if="cat.icon" class="manage-cat-icon">{{ cat.icon }}</span>
              <span class="manage-cat-name">{{ cat.name }}</span>
              <span class="manage-cat-count">{{ recipesByCategory.get(cat.id)?.length ?? 0 }}</span>
            </div>
            <div class="manage-cat-actions">
              <button class="manage-btn" @click="openEditCategory(cat); showManageCategories = false">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="m18.5 2.5 2 2L9 16l-4 1 1-4 11.5-11.5Z"/>
                </svg>
              </button>
              <button class="manage-btn manage-btn--danger" @click="handleDeleteCategory(cat.id)">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
                </svg>
              </button>
            </div>
          </div>
        </div>

        <button class="add-cat-btn" @click="showManageCategories = false; openNewCategory()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Neue Kategorie
        </button>
      </div>
    </AppSheetModal>

    <!-- ── Add to shopping list sheet ────────────────────────── -->
    <AppSheetModal
      :is-open="showShoppingPicker"
      title="Zur Einkaufsliste"
      :breakpoints="[0, 0.55, 0.72]"
      :initial-breakpoint="0.55"
      close-label="Schließen"
      @close="showShoppingPicker = false"
    >
      <div class="shopping-picker">
        <p class="shopping-picker-info">
          {{ detailRecipe?.ingredients.length ?? 0 }} Zutaten aus "{{ detailRecipe?.title }}" hinzufügen
        </p>
        <div class="list-chips">
          <button
            v-for="list in lists"
            :key="list.id"
            class="list-chip"
            :class="{ 'list-chip--active': selectedShoppingListId === list.id }"
            @click="selectedShoppingListId = list.id"
          >
            {{ list.title }}
          </button>
        </div>
        <p v-if="lists.length === 0" class="shopping-picker-empty">Keine Einkaufsliste vorhanden.</p>
        <button
          class="shopping-add-btn"
          :disabled="shoppingBusy || !selectedShoppingListId"
          @click="handleAddToShoppingList"
        >
          {{ shoppingBusy ? 'Wird hinzugefügt…' : 'Hinzufügen' }}
        </button>
        <p v-if="shoppingMsg" class="shopping-msg shopping-msg--ok">{{ shoppingMsg }}</p>
        <p v-if="shoppingErr" class="shopping-msg shopping-msg--err">{{ shoppingErr }}</p>
      </div>
    </AppSheetModal>

  </div>
</template>

<style scoped>
.recipe-manager {
  position: relative;
  min-height: 40vh;
}

/* ── Screens ────────────────────────────────────────────────── */
.screen {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.screen-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding-bottom: 0.25rem;
}

.screen-subtitle {
  font-size: 1.0625rem;
  color: var(--app-text-muted);
  margin: 0;
  font-weight: 500;
}

.screen-count {
  font-size: 1.0625rem;
  color: var(--app-text-muted);
  font-weight: 500;
}

.toolbar-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.toolbar-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.375rem 0.75rem;
  border: 1px solid rgba(71, 85, 105, 0.6);
  border-radius: 9999px;
  background: transparent;
  color: var(--app-text-muted);
  font-family: var(--ion-font-family);
  font-size: 1.03rem;
  font-weight: 600;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: all 0.14s;
}

.toolbar-btn:active {
  background: rgba(71, 85, 105, 0.15);
  color: var(--app-text);
}

.toolbar-add-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.4rem 0.85rem;
  border: 1px solid rgba(34, 197, 94, 0.4);
  border-radius: 9999px;
  background: rgba(34, 197, 94, 0.16);
  color: rgb(134 239 172);
  font-family: var(--ion-font-family);
  font-size: 1.03rem;
  font-weight: 700;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: background 0.14s, transform 0.1s;
}

.toolbar-add-btn ion-icon {
  font-size: 1.15rem;
}

.toolbar-add-btn:active {
  background: rgba(34, 197, 94, 0.28);
  transform: scale(0.97);
}

.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  background: transparent;
  border: none;
  color: var(--app-primary);
  font-family: var(--ion-font-family);
  font-size: 1.125rem;
  font-weight: 600;
  cursor: pointer;
  padding: 0;
  -webkit-tap-highlight-color: transparent;
}

.cat-detail-badge {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 1.15rem;
  font-weight: 700;
}

/* ── Category grid ────────────────────────────────────────── */
.cat-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.625rem;
}

/* ── Recipe list ─────────────────────────────────────────── */
.recipe-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

/* ── Section label ───────────────────────────────────────── */
.section-label {
  font-size: 0.97rem;
  font-weight: 700;
  color: var(--app-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.07em;
  margin: 0.25rem 0 0;
}

/* ── Empty state ─────────────────────────────────────────── */
.empty-state {
  text-align: center;
  padding: 3rem 1rem 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.empty-icon {
  font-size: 3.25rem;
  line-height: 1;
  margin-bottom: 0.5rem;
  opacity: 0.6;
}

.empty-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--app-text-muted);
  margin: 0;
}

.empty-hint {
  font-size: 1.0625rem;
  color: #475569;
  margin: 0;
  max-width: 240px;
}

/* ── No categories hint ──────────────────────────────────── */
.no-cats-hint {
  text-align: center;
  padding: 1rem;
  border: 1px dashed rgba(71, 85, 105, 0.4);
  border-radius: 1rem;
}

.no-cats-hint p {
  font-size: 1.125rem;
  color: var(--app-text-muted);
  margin: 0 0 0.75rem;
}

.hint-create-btn {
  padding: 0.5rem 1.25rem;
  background: rgba(34, 197, 94, 0.12);
  border: 1px solid rgba(34, 197, 94, 0.3);
  border-radius: 9999px;
  color: #4ade80;
  font-family: var(--ion-font-family);
  font-size: 1.125rem;
  font-weight: 600;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

/* ── Manage categories ───────────────────────────────────── */
.manage-cats {
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
  padding-bottom: 1rem;
}

.manage-cats-empty {
  text-align: center;
  padding: 1.5rem 0;
  color: var(--app-text-muted);
  font-size: 1.125rem;
}

.manage-cat-list {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.manage-cat-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background: rgba(30, 41, 59, 0.72);
  border: 1px solid rgba(71, 85, 105, 0.5);
  border-radius: 0.875rem;
}

.manage-cat-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
  min-width: 0;
}

.manage-cat-icon { font-size: 1.375rem; }

.manage-cat-name {
  font-size: 1.1875rem;
  font-weight: 600;
  color: var(--app-text);
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.manage-cat-count {
  font-size: 1rem;
  font-weight: 600;
  color: var(--app-text-muted);
  background: rgba(51, 65, 85, 0.6);
  border-radius: 9999px;
  padding: 0.1rem 0.5rem;
}

.manage-cat-actions {
  display: flex;
  gap: 0.375rem;
}

.manage-btn {
  width: 2rem;
  height: 2rem;
  border-radius: 0.5rem;
  border: 1px solid rgba(71, 85, 105, 0.5);
  background: transparent;
  color: var(--app-text-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  -webkit-tap-highlight-color: transparent;
  transition: all 0.12s;
}

.manage-btn:active { background: rgba(71, 85, 105, 0.2); }
.manage-btn--danger { border-color: rgba(239, 68, 68, 0.3); color: #f87171; }
.manage-btn--danger:active { background: rgba(239, 68, 68, 0.15); }

.add-cat-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.875rem;
  background: rgba(34, 197, 94, 0.1);
  border: 1px dashed rgba(34, 197, 94, 0.35);
  border-radius: 1rem;
  color: #4ade80;
  font-family: var(--ion-font-family);
  font-size: 1.1875rem;
  font-weight: 700;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: background 0.14s;
}

.add-cat-btn:active { background: rgba(34, 197, 94, 0.18); }

/* ── Shopping picker ─────────────────────────────────────── */
.shopping-picker {
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
  padding-bottom: 1rem;
}

.shopping-picker-info {
  font-size: 1.125rem;
  color: var(--app-text-muted);
  margin: 0;
}

.shopping-picker-empty {
  font-size: 1.125rem;
  color: var(--app-text-muted);
  text-align: center;
  margin: 0;
}

.list-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
}

.list-chip {
  padding: 0.375rem 0.875rem;
  border: 1px solid rgba(71, 85, 105, 0.6);
  border-radius: 9999px;
  background: transparent;
  color: var(--app-text-muted);
  font-family: var(--ion-font-family);
  font-size: 1.0625rem;
  font-weight: 600;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: all 0.14s;
}

.list-chip--active {
  background: rgba(34, 197, 94, 0.14);
  border-color: rgba(34, 197, 94, 0.45);
  color: #4ade80;
}

.shopping-add-btn {
  width: 100%;
  padding: 0.875rem;
  background: var(--app-primary);
  color: #fff;
  font-family: var(--ion-font-family);
  font-weight: 700;
  font-size: 1.25rem;
  border: 0;
  border-radius: 1rem;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: background 0.14s, transform 0.1s;
}

.shopping-add-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.shopping-add-btn:active:not(:disabled) { transform: scale(0.98); background: var(--app-primary-strong); }

.shopping-msg {
  font-size: 1.0625rem;
  text-align: center;
  margin: 0;
}

.shopping-msg--ok { color: #4ade80; }
.shopping-msg--err { color: #f87171; }
</style>

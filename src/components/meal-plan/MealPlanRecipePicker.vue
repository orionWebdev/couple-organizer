<script setup lang="ts">
import { computed, ref } from 'vue'
import AppSheetModal from '@/components/ui/AppSheetModal.vue'
import type { Recipe, RecipeCategory, RecipeCategoryColor, MealType } from '@/types'

const props = defineProps<{
  isOpen: boolean
  recipes: ReadonlyArray<Recipe>
  categories: ReadonlyArray<RecipeCategory>
  mealType: MealType
  currentRecipeId: string | null
}>()

const emit = defineEmits<{
  close: []
  select: [recipeId: string | null]
}>()

const COLOR_ACCENT: Record<RecipeCategoryColor, string> = {
  blue: '#93c5fd', green: '#86efac', yellow: '#fde047', red: '#fca5a5',
  purple: '#d8b4fe', orange: '#fdba74', pink: '#f9a8d4', teal: '#5eead4',
}
const COLOR_BG: Record<RecipeCategoryColor, string> = {
  blue: 'rgba(37,99,235,0.18)', green: 'rgba(21,128,61,0.18)', yellow: 'rgba(180,83,9,0.18)',
  red: 'rgba(220,38,38,0.18)', purple: 'rgba(124,58,237,0.18)', orange: 'rgba(194,65,12,0.18)',
  pink: 'rgba(190,24,93,0.18)', teal: 'rgba(15,118,110,0.18)',
}

const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Frühstück',
  lunch: 'Mittagessen',
  dinner: 'Abendessen',
}

type FilterKey = MealType | 'schnell' | 'vegetarisch'

const STATIC_FILTERS: Array<{ key: FilterKey; label: string }> = [
  { key: 'breakfast',   label: 'Frühstück'    },
  { key: 'lunch',       label: 'Mittagessen'  },
  { key: 'dinner',      label: 'Abendessen'   },
  { key: 'schnell',     label: '⚡ Schnell'    },
  { key: 'vegetarisch', label: '🥗 Vegetarisch' },
]

const searchQuery = ref('')
const activeFilter = ref<FilterKey | null>(null)

const categoriesById = computed(() => {
  const map = new Map<string, RecipeCategory>()
  for (const c of props.categories) map.set(c.id, c)
  return map
})

function matchesFilter(recipe: Recipe, filter: FilterKey | null): boolean {
  if (!filter) return true
  if (filter === 'schnell') return !!(recipe.cookingTime && recipe.cookingTime <= 30)
  if (filter === 'vegetarisch') return recipe.categories.some((cid) => {
    const cat = categoriesById.value.get(cid)
    return cat?.name.toLowerCase().includes('vegetar')
  })
  // meal type filters: match category by name
  const targetName = MEAL_LABELS[filter as MealType]?.toLowerCase()
  if (!targetName) return true
  return recipe.categories.some((cid) => {
    const cat = categoriesById.value.get(cid)
    return cat?.name.toLowerCase() === targetName
  })
}

const filteredRecipes = computed(() => {
  const q = searchQuery.value.toLowerCase().trim()
  return props.recipes.filter((r) => {
    const matchesSearch = !q || r.title.toLowerCase().includes(q)
    const matchesCatSearch = !q || props.categories
      .filter((c) => r.categories.includes(c.id))
      .some((c) => c.name.toLowerCase().includes(q))
    return (matchesSearch || matchesCatSearch) && matchesFilter(r, activeFilter.value)
  })
})

const favorites = computed(() =>
  filteredRecipes.value.filter((r) => r.isFavorite)
)

const recentlyUsed = computed(() =>
  filteredRecipes.value
    .filter((r) => !r.isFavorite && r.lastUsedAt)
    .sort((a, b) => {
      const ta = (a.lastUsedAt as any)?.seconds ?? 0
      const tb = (b.lastUsedAt as any)?.seconds ?? 0
      return tb - ta
    })
    .slice(0, 5)
)

const remainingRecipes = computed(() => {
  const usedIds = new Set([...favorites.value.map((r) => r.id), ...recentlyUsed.value.map((r) => r.id)])
  return filteredRecipes.value.filter((r) => !usedIds.has(r.id))
})

const hasAnySection = computed(() =>
  favorites.value.length > 0 || recentlyUsed.value.length > 0 || remainingRecipes.value.length > 0
)

function pickRandom() {
  if (filteredRecipes.value.length === 0) return
  const r = filteredRecipes.value[Math.floor(Math.random() * filteredRecipes.value.length)]
  emit('select', r.id)
}

function selectRecipe(id: string | null) {
  emit('select', id)
}

function getRecipeCats(recipe: Recipe): RecipeCategory[] {
  return recipe.categories.map((cid) => categoriesById.value.get(cid)).filter(Boolean) as RecipeCategory[]
}

function cookingTimeLabel(recipe: Recipe): string | null {
  const t = recipe.cookingTime
  if (!t) return null
  return t < 60 ? `${t} Min` : `${Math.floor(t / 60)}h ${t % 60 ? (t % 60) + 'min' : ''}`.trim()
}
</script>

<template>
  <AppSheetModal
    :is-open="isOpen"
    :title="`Rezept für ${MEAL_LABELS[mealType]}`"
    :breakpoints="[0, 0.9, 1]"
    :initial-breakpoint="0.9"
    close-label="Abbrechen"
    @close="emit('close')"
  >
    <div class="picker-body">

      <!-- Search bar -->
      <div class="search-wrap">
        <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          v-model="searchQuery"
          type="search"
          class="search-input"
          placeholder="Rezept suchen..."
          autocomplete="off"
          autocorrect="off"
          spellcheck="false"
        />
        <button v-if="searchQuery" class="search-clear" @click="searchQuery = ''">×</button>
      </div>

      <!-- Filter chips -->
      <div class="filter-chips">
        <button
          v-for="f in STATIC_FILTERS"
          :key="f.key"
          class="filter-chip"
          :class="{ 'filter-chip--active': activeFilter === f.key }"
          @click="activeFilter = activeFilter === f.key ? null : f.key"
        >
          {{ f.label }}
        </button>
      </div>

      <!-- Clear option -->
      <button
        v-if="currentRecipeId"
        class="clear-option"
        @click="selectRecipe(null)"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
        </svg>
        Kein Rezept
      </button>

      <!-- Empty state -->
      <div v-if="!hasAnySection && recipes.length === 0" class="picker-empty">
        <p>Noch keine Rezepte vorhanden.</p>
        <p class="picker-empty-hint">Erstelle Rezepte im Tab Rezepte.</p>
      </div>
      <div v-else-if="!hasAnySection" class="picker-empty">
        <p>Keine Rezepte gefunden.</p>
      </div>

      <!-- Favoriten section -->
      <template v-if="favorites.length > 0">
        <h3 class="section-heading">⭐ Favoriten</h3>
        <div class="recipe-list">
          <button
            v-for="recipe in favorites"
            :key="recipe.id"
            class="picker-recipe"
            :class="{ 'picker-recipe--active': currentRecipeId === recipe.id }"
            @click="selectRecipe(recipe.id)"
          >
            <div class="picker-recipe-img" :class="{ 'picker-recipe-img--placeholder': !recipe.image }">
              <img v-if="recipe.image" :src="recipe.image" :alt="recipe.title" />
              <span v-else class="picker-recipe-emoji">🍽️</span>
            </div>
            <div class="picker-recipe-info">
              <span class="picker-recipe-title">{{ recipe.title }}</span>
              <div class="picker-recipe-meta">
                <span v-if="cookingTimeLabel(recipe)" class="picker-meta-chip">⏱ {{ cookingTimeLabel(recipe) }}</span>
                <span
                  v-for="cat in getRecipeCats(recipe).slice(0, 2)"
                  :key="cat.id"
                  class="picker-cat-chip"
                  :style="{ color: COLOR_ACCENT[cat.color], background: COLOR_BG[cat.color] }"
                >
                  <span v-if="cat.icon">{{ cat.icon }}</span>{{ cat.name }}
                </span>
              </div>
            </div>
            <div class="picker-recipe-check" v-if="currentRecipeId === recipe.id">✓</div>
          </button>
        </div>
      </template>

      <!-- Zuletzt verwendet section -->
      <template v-if="recentlyUsed.length > 0">
        <h3 class="section-heading">🕐 Zuletzt verwendet</h3>
        <div class="recipe-list">
          <button
            v-for="recipe in recentlyUsed"
            :key="recipe.id"
            class="picker-recipe"
            :class="{ 'picker-recipe--active': currentRecipeId === recipe.id }"
            @click="selectRecipe(recipe.id)"
          >
            <div class="picker-recipe-img" :class="{ 'picker-recipe-img--placeholder': !recipe.image }">
              <img v-if="recipe.image" :src="recipe.image" :alt="recipe.title" />
              <span v-else class="picker-recipe-emoji">🍽️</span>
            </div>
            <div class="picker-recipe-info">
              <span class="picker-recipe-title">{{ recipe.title }}</span>
              <div class="picker-recipe-meta">
                <span v-if="cookingTimeLabel(recipe)" class="picker-meta-chip">⏱ {{ cookingTimeLabel(recipe) }}</span>
                <span
                  v-for="cat in getRecipeCats(recipe).slice(0, 2)"
                  :key="cat.id"
                  class="picker-cat-chip"
                  :style="{ color: COLOR_ACCENT[cat.color], background: COLOR_BG[cat.color] }"
                >
                  <span v-if="cat.icon">{{ cat.icon }}</span>{{ cat.name }}
                </span>
              </div>
            </div>
            <div class="picker-recipe-check" v-if="currentRecipeId === recipe.id">✓</div>
          </button>
        </div>
      </template>

      <!-- All remaining recipes -->
      <template v-if="remainingRecipes.length > 0">
        <h3 class="section-heading" v-if="favorites.length > 0 || recentlyUsed.length > 0">Alle Rezepte</h3>
        <div class="recipe-list">
          <button
            v-for="recipe in remainingRecipes"
            :key="recipe.id"
            class="picker-recipe"
            :class="{ 'picker-recipe--active': currentRecipeId === recipe.id }"
            @click="selectRecipe(recipe.id)"
          >
            <div class="picker-recipe-img" :class="{ 'picker-recipe-img--placeholder': !recipe.image }">
              <img v-if="recipe.image" :src="recipe.image" :alt="recipe.title" />
              <span v-else class="picker-recipe-emoji">🍽️</span>
            </div>
            <div class="picker-recipe-info">
              <span class="picker-recipe-title">{{ recipe.title }}</span>
              <div class="picker-recipe-meta">
                <span v-if="cookingTimeLabel(recipe)" class="picker-meta-chip">⏱ {{ cookingTimeLabel(recipe) }}</span>
                <span
                  v-for="cat in getRecipeCats(recipe).slice(0, 2)"
                  :key="cat.id"
                  class="picker-cat-chip"
                  :style="{ color: COLOR_ACCENT[cat.color], background: COLOR_BG[cat.color] }"
                >
                  <span v-if="cat.icon">{{ cat.icon }}</span>{{ cat.name }}
                </span>
              </div>
            </div>
            <div class="picker-recipe-check" v-if="currentRecipeId === recipe.id">✓</div>
          </button>
        </div>
      </template>

      <!-- Random recipe button -->
      <button
        v-if="filteredRecipes.length > 1"
        class="random-btn"
        @click="pickRandom"
      >
        🎲 Zufälliges Gericht
      </button>

    </div>
  </AppSheetModal>
</template>

<style scoped>
.picker-body {
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
  padding-bottom: 2rem;
}

/* Search */
.search-wrap {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(8, 13, 28, 0.72);
  border: 1.5px solid rgba(100, 116, 139, 0.4);
  border-radius: 0.875rem;
  padding: 0 0.875rem;
  transition: border-color 0.2s;
}

.search-wrap:focus-within {
  border-color: var(--app-primary);
  box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.18);
}

.search-icon {
  color: var(--app-text-muted);
  flex-shrink: 0;
  opacity: 0.7;
}

.search-input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: var(--app-text);
  font-family: var(--ion-font-family);
  font-size: 1.1875rem;
  padding: 0.7rem 0;
  -webkit-appearance: none;
}

.search-input::placeholder { color: var(--app-text-muted); }
.search-input::-webkit-search-cancel-button { -webkit-appearance: none; }

.search-clear {
  background: transparent;
  border: none;
  color: var(--app-text-muted);
  font-size: 1.375rem;
  cursor: pointer;
  padding: 0;
  line-height: 1;
  flex-shrink: 0;
}

/* Filter chips */
.filter-chips {
  display: flex;
  gap: 0.375rem;
  overflow-x: auto;
  -ms-overflow-style: none;
  scrollbar-width: none;
  padding-bottom: 2px;
}

.filter-chips::-webkit-scrollbar { display: none; }

.filter-chip {
  flex-shrink: 0;
  padding: 0.35rem 0.75rem;
  border-radius: 9999px;
  border: 1px solid rgba(71, 85, 105, 0.6);
  background: transparent;
  color: var(--app-text-muted);
  font-family: var(--ion-font-family);
  font-size: 1.03rem;
  font-weight: 600;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: all 0.14s;
  white-space: nowrap;
}

.filter-chip--active {
  background: rgba(34, 197, 94, 0.14);
  border-color: rgba(34, 197, 94, 0.5);
  color: #4ade80;
}

/* Clear option */
.clear-option {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.625rem 0.875rem;
  background: transparent;
  border: 1px dashed rgba(71, 85, 105, 0.5);
  border-radius: 0.875rem;
  color: var(--app-text-muted);
  font-family: var(--ion-font-family);
  font-size: 1.125rem;
  font-weight: 500;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: background 0.12s;
}

.clear-option:active { background: rgba(71, 85, 105, 0.1); }

/* Section heading */
.section-heading {
  font-size: 0.97rem;
  font-weight: 700;
  color: var(--app-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.07em;
  margin: 0;
}

/* Recipe list */
.recipe-list {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

/* Picker recipe row */
.picker-recipe {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  text-align: left;
  padding: 0.625rem 0.75rem;
  background: rgba(30, 41, 59, 0.72);
  border: 1px solid rgba(71, 85, 105, 0.5);
  border-radius: 0.875rem;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: background 0.12s, border-color 0.12s;
}

.picker-recipe:active { background: rgba(30, 41, 59, 1); }

.picker-recipe--active {
  border-color: rgba(34, 197, 94, 0.45);
  background: rgba(34, 197, 94, 0.07);
}

/* Recipe thumbnail */
.picker-recipe-img {
  width: 3rem;
  height: 3rem;
  border-radius: 0.625rem;
  overflow: hidden;
  flex-shrink: 0;
  background: rgba(15, 23, 42, 0.64);
  border: 1px solid rgba(71, 85, 105, 0.35);
}

.picker-recipe-img img { width: 100%; height: 100%; object-fit: cover; }

.picker-recipe-img--placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
}

.picker-recipe-emoji { font-size: 1.5rem; }

/* Recipe info */
.picker-recipe-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.picker-recipe-title {
  font-size: 1.15rem;
  font-weight: 600;
  color: var(--app-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.picker-recipe-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.25rem;
}

.picker-meta-chip {
  font-size: 0.93rem;
  color: var(--app-text-muted);
  font-weight: 500;
}

.picker-cat-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.15rem;
  font-size: 0.9rem;
  font-weight: 600;
  padding: 0.1rem 0.4rem;
  border-radius: 9999px;
}

/* Check mark */
.picker-recipe-check {
  font-size: 1.25rem;
  color: var(--app-primary);
  font-weight: 700;
  flex-shrink: 0;
}

/* Empty */
.picker-empty {
  text-align: center;
  padding: 2rem 0 1rem;
}

.picker-empty p {
  font-size: 1.1875rem;
  color: var(--app-text-muted);
  margin: 0;
}

.picker-empty-hint {
  font-size: 1.0625rem !important;
  margin-top: 0.25rem !important;
  opacity: 0.7;
}

/* Random button */
.random-btn {
  margin-top: 0.5rem;
  width: 100%;
  padding: 0.875rem;
  background: rgba(168, 85, 247, 0.1);
  border: 1px solid rgba(168, 85, 247, 0.3);
  border-radius: 1rem;
  color: #c4b5fd;
  font-family: var(--ion-font-family);
  font-size: 1.1875rem;
  font-weight: 700;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: background 0.14s, transform 0.1s;
}

.random-btn:active {
  background: rgba(168, 85, 247, 0.2);
  transform: scale(0.98);
}
</style>

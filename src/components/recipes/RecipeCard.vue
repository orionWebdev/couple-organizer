<script setup lang="ts">
import { computed } from 'vue'
import type { Recipe, RecipeCategory, RecipeCategoryColor } from '@/types'

const props = defineProps<{
  recipe: Readonly<Recipe>
  categories: ReadonlyArray<RecipeCategory>
}>()

const emit = defineEmits<{
  tap: []
  toggleFavorite: []
}>()

const COLOR_ACCENT: Record<RecipeCategoryColor, string> = {
  blue:   '#93c5fd',
  green:  '#86efac',
  yellow: '#fde047',
  red:    '#fca5a5',
  purple: '#d8b4fe',
  orange: '#fdba74',
  pink:   '#f9a8d4',
  teal:   '#5eead4',
}

const COLOR_BG: Record<RecipeCategoryColor, string> = {
  blue:   'rgba(37,99,235,0.18)',
  green:  'rgba(21,128,61,0.18)',
  yellow: 'rgba(180,83,9,0.18)',
  red:    'rgba(220,38,38,0.18)',
  purple: 'rgba(124,58,237,0.18)',
  orange: 'rgba(194,65,12,0.18)',
  pink:   'rgba(190,24,93,0.18)',
  teal:   'rgba(15,118,110,0.18)',
}

const recipeCats = computed(() =>
  props.categories.filter((c) => props.recipe.categories?.includes(c.id))
)

const cookingTimeLabel = computed(() => {
  const t = props.recipe.cookingTime
  if (!t) return null
  return t < 60 ? `${t} Min` : `${Math.floor(t / 60)}h ${t % 60 ? (t % 60) + 'min' : ''}`.trim()
})
</script>

<template>
  <button class="recipe-card" @click="emit('tap')">
    <!-- Image or placeholder -->
    <div class="recipe-card-img" :class="{ 'recipe-card-img--placeholder': !recipe.image }">
      <img v-if="recipe.image" :src="recipe.image" :alt="recipe.title" />
      <span v-else class="recipe-card-emoji">🍽️</span>
    </div>

    <!-- Content -->
    <div class="recipe-card-body">
      <div class="recipe-card-top">
        <h3 class="recipe-card-title">{{ recipe.title }}</h3>
        <button
          class="recipe-fav-btn"
          :class="{ 'recipe-fav-btn--active': recipe.isFavorite }"
          @click.stop="emit('toggleFavorite')"
        >
          {{ recipe.isFavorite ? '★' : '☆' }}
        </button>
      </div>

      <!-- Category tags -->
      <div v-if="recipeCats.length > 0" class="recipe-card-tags">
        <span
          v-for="cat in recipeCats"
          :key="cat.id"
          class="recipe-tag"
          :style="{
            background: COLOR_BG[cat.color],
            color: COLOR_ACCENT[cat.color],
            borderColor: COLOR_ACCENT[cat.color] + '44'
          }"
        >
          <span v-if="cat.icon" class="recipe-tag-icon">{{ cat.icon }}</span>
          {{ cat.name }}
        </span>
      </div>

      <!-- Meta row -->
      <div v-if="cookingTimeLabel" class="recipe-card-meta">
        <span class="recipe-meta-item">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
          </svg>
          {{ cookingTimeLabel }}
        </span>
      </div>
    </div>
  </button>
</template>

<style scoped>
.recipe-card {
  display: flex;
  align-items: center;
  gap: 0.875rem;
  width: 100%;
  text-align: left;
  padding: 0.75rem;
  background: rgba(30, 41, 59, 0.92);
  border: 1px solid rgba(71, 85, 105, 0.56);
  border-radius: 1rem;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: background 0.12s, border-color 0.12s;
}

.recipe-card:active {
  background: rgba(30, 41, 59, 1);
  border-color: rgba(71, 85, 105, 0.8);
}

/* Image */
.recipe-card-img {
  width: 4rem;
  height: 4rem;
  border-radius: 0.75rem;
  overflow: hidden;
  flex-shrink: 0;
  background: rgba(15, 23, 42, 0.64);
  border: 1px solid rgba(71, 85, 105, 0.4);
}

.recipe-card-img img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.recipe-card-img--placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
}

.recipe-card-emoji {
  font-size: 1.875rem;
  line-height: 1;
}

/* Body */
.recipe-card-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.recipe-card-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.5rem;
}

.recipe-card-title {
  font-size: 1.1875rem;
  font-weight: 600;
  color: var(--app-text);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}

/* Favorite */
.recipe-fav-btn {
  font-size: 1.375rem;
  line-height: 1;
  color: #475569;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0;
  flex-shrink: 0;
  -webkit-tap-highlight-color: transparent;
  transition: color 0.12s, transform 0.1s;
}

.recipe-fav-btn--active {
  color: #fbbf24;
}

.recipe-fav-btn:active {
  transform: scale(1.25);
}

/* Category tags */
.recipe-card-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
}

.recipe-tag {
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  font-size: 0.9375rem;
  font-weight: 600;
  padding: 0.175rem 0.5rem;
  border-radius: 9999px;
  border: 1px solid transparent;
  letter-spacing: 0.01em;
}

.recipe-tag-icon {
  font-size: 1rem;
}

/* Meta */
.recipe-card-meta {
  display: flex;
  align-items: center;
  gap: 0.625rem;
}

.recipe-meta-item {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.97rem;
  color: var(--app-text-muted);
  font-weight: 500;
}

.recipe-meta-item svg {
  opacity: 0.7;
}
</style>

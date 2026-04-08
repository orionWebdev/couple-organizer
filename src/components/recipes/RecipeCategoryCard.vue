<script setup lang="ts">
import { computed } from 'vue'
import type { RecipeCategory, Recipe, RecipeCategoryColor } from '@/types'

const props = defineProps<{
  category: Readonly<RecipeCategory>
  recipes: ReadonlyArray<Recipe>
}>()

const emit = defineEmits<{
  tap: []
  edit: []
  delete: []
}>()

const COLOR_STYLES: Record<RecipeCategoryColor, { gradient: string; border: string; accent: string }> = {
  blue:   { gradient: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)', border: 'rgba(59,130,246,0.55)',  accent: '#93c5fd' },
  green:  { gradient: 'linear-gradient(135deg, #14532d 0%, #15803d 100%)', border: 'rgba(34,197,94,0.55)',   accent: '#86efac' },
  yellow: { gradient: 'linear-gradient(135deg, #713f12 0%, #b45309 100%)', border: 'rgba(234,179,8,0.55)',   accent: '#fde047' },
  red:    { gradient: 'linear-gradient(135deg, #7f1d1d 0%, #dc2626 100%)', border: 'rgba(239,68,68,0.55)',   accent: '#fca5a5' },
  purple: { gradient: 'linear-gradient(135deg, #4c1d95 0%, #7c3aed 100%)', border: 'rgba(168,85,247,0.55)',  accent: '#d8b4fe' },
  orange: { gradient: 'linear-gradient(135deg, #7c2d12 0%, #c2410c 100%)', border: 'rgba(249,115,22,0.55)',  accent: '#fdba74' },
  pink:   { gradient: 'linear-gradient(135deg, #831843 0%, #be185d 100%)', border: 'rgba(236,72,153,0.55)',  accent: '#f9a8d4' },
  teal:   { gradient: 'linear-gradient(135deg, #134e4a 0%, #0f766e 100%)', border: 'rgba(20,184,166,0.55)',  accent: '#5eead4' },
}

const colorStyle = computed(() => COLOR_STYLES[props.category.color] ?? COLOR_STYLES.blue)
const previewRecipes = computed(() => props.recipes.slice(0, 4))
</script>

<template>
  <button
    class="cat-card"
    :style="{
      background: colorStyle.gradient,
      borderColor: colorStyle.border,
    }"
    @click="emit('tap')"
  >
    <!-- Header -->
    <div class="cat-card-header">
      <div class="cat-card-title-row">
        <span v-if="category.icon" class="cat-card-icon">{{ category.icon }}</span>
        <span class="cat-card-name" :style="{ color: colorStyle.accent }">{{ category.name }}</span>
      </div>
      <div class="cat-card-actions" @click.stop>
        <button class="cat-action-btn" title="Bearbeiten" @click="emit('edit')">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="m18.5 2.5 2 2L9 16l-4 1 1-4 11.5-11.5Z"/>
          </svg>
        </button>
        <button class="cat-action-btn cat-action-btn--danger" title="Löschen" @click="emit('delete')">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6l-1 14H6L5 6"/>
            <path d="M10 11v6M14 11v6"/>
            <path d="M9 6V4h6v2"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- Recipe count badge -->
    <p class="cat-count">{{ recipes.length }} {{ recipes.length === 1 ? 'Rezept' : 'Rezepte' }}</p>

    <!-- Recipe preview list -->
    <ul v-if="previewRecipes.length > 0" class="cat-preview-list">
      <li
        v-for="recipe in previewRecipes"
        :key="recipe.id"
        class="cat-preview-item"
      >
        <span class="cat-preview-dot" :style="{ background: colorStyle.accent }" />
        <span class="cat-preview-title">{{ recipe.title }}</span>
      </li>
    </ul>
    <p v-else class="cat-empty-hint">Noch keine Rezepte</p>
  </button>
</template>

<style scoped>
.cat-card {
  width: 100%;
  text-align: left;
  border-radius: 1.125rem;
  border: 1px solid transparent;
  padding: 1rem 1rem 0.875rem;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  -webkit-tap-highlight-color: transparent;
  transition: transform 0.12s ease, filter 0.12s ease;
  position: relative;
  overflow: hidden;
}

.cat-card::before {
  content: '';
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0);
  transition: background 0.12s;
  border-radius: inherit;
}

.cat-card:active::before {
  background: rgba(255, 255, 255, 0.07);
}

.cat-card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.5rem;
}

.cat-card-title-row {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  flex: 1;
  min-width: 0;
}

.cat-card-icon {
  font-size: 1.375rem;
  line-height: 1;
  flex-shrink: 0;
}

.cat-card-name {
  font-size: 1.25rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cat-card-actions {
  display: flex;
  gap: 0.25rem;
  flex-shrink: 0;
}

.cat-action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 0.5rem;
  border: none;
  background: rgba(0, 0, 0, 0.22);
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: background 0.12s, color 0.12s;
}

.cat-action-btn:active {
  background: rgba(0, 0, 0, 0.38);
  color: #fff;
}

.cat-action-btn--danger:active {
  background: rgba(239, 68, 68, 0.4);
  color: #fca5a5;
}

.cat-count {
  font-size: 0.97rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.55);
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.cat-preview-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  margin-top: 0.125rem;
}

.cat-preview-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.cat-preview-dot {
  width: 0.375rem;
  height: 0.375rem;
  border-radius: 9999px;
  flex-shrink: 0;
  opacity: 0.8;
}

.cat-preview-title {
  font-size: 1.0625rem;
  color: rgba(255, 255, 255, 0.82);
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cat-empty-hint {
  font-size: 1.03rem;
  color: rgba(255, 255, 255, 0.38);
  margin: 0;
  font-style: italic;
}
</style>

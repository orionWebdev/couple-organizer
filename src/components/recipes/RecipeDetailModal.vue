<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonContent
} from '@ionic/vue'
import type { Recipe, RecipeCategory, RecipeCategoryColor } from '@/types'

const props = defineProps<{
  isOpen: boolean
  recipe: Readonly<Recipe> | null
  categories: ReadonlyArray<RecipeCategory>
}>()

const emit = defineEmits<{
  close: []
  edit: []
  delete: []
  toggleFavorite: []
  addToMealPlan: []
  addToShoppingList: []
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

const showDeleteConfirm = ref(false)

const recipeCats = computed(() =>
  props.categories.filter((c) => props.recipe?.categories?.includes(c.id))
)

const cookingTimeLabel = computed(() => {
  const t = props.recipe?.cookingTime
  if (!t) return null
  return t < 60 ? `${t} Min` : `${Math.floor(t / 60)}h ${t % 60 ? (t % 60) + 'min' : ''}`.trim()
})

function confirmDelete() {
  showDeleteConfirm.value = false
  emit('delete')
}
</script>

<template>
  <ion-modal
    :is-open="isOpen"
    css-class="app-fullscreen-modal"
    @did-dismiss="emit('close')"
  >
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button @click="emit('close')">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
            </svg>
          </ion-button>
        </ion-buttons>
        <ion-title>{{ recipe?.title ?? '' }}</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="emit('edit')">Bearbeiten</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content v-if="recipe">
      <div class="detail-scroll">

        <!-- Hero image -->
        <div v-if="recipe.image" class="detail-hero">
          <img :src="recipe.image" :alt="recipe.title" />
        </div>
        <div v-else class="detail-hero detail-hero--placeholder">
          <span class="detail-hero-emoji">🍽️</span>
        </div>

        <!-- Title + meta -->
        <div class="detail-header">
          <div class="detail-title-row">
            <h1 class="detail-title">{{ recipe.title }}</h1>
            <button
              class="detail-fav-btn"
              :class="{ 'detail-fav-btn--active': recipe.isFavorite }"
              @click="emit('toggleFavorite')"
            >{{ recipe.isFavorite ? '★' : '☆' }}</button>
          </div>

          <!-- Meta row -->
          <div class="detail-meta-row">
            <span v-if="cookingTimeLabel" class="detail-meta-chip">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
              {{ cookingTimeLabel }}
            </span>
            <span class="detail-meta-chip">
              🥄 {{ recipe.ingredients.length }} Zutaten
            </span>
          </div>

          <!-- Category tags -->
          <div v-if="recipeCats.length > 0" class="detail-tags">
            <span
              v-for="cat in recipeCats"
              :key="cat.id"
              class="detail-tag"
              :style="{ background: COLOR_BG[cat.color], color: COLOR_ACCENT[cat.color], borderColor: COLOR_ACCENT[cat.color] + '44' }"
            >
              <span v-if="cat.icon">{{ cat.icon }}</span>
              {{ cat.name }}
            </span>
          </div>
        </div>

        <!-- Ingredients section -->
        <section class="detail-section">
          <h2 class="detail-section-title">Zutaten</h2>
          <ul class="ingredient-list">
            <li v-for="(ing, i) in recipe.ingredients" :key="i" class="ingredient-item">
              <span class="ingredient-amount">{{ ing.amount }} {{ ing.unit }}</span>
              <span class="ingredient-name">{{ ing.name }}</span>
            </li>
          </ul>
        </section>

        <!-- Instructions section -->
        <section class="detail-section">
          <h2 class="detail-section-title">Zubereitung</h2>
          <p class="detail-instructions">{{ recipe.instructions }}</p>
        </section>

        <!-- Action buttons -->
        <div class="detail-actions">
          <button class="action-btn action-btn--primary" @click="emit('addToMealPlan')">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
              <line x1="12" y1="14" x2="12" y2="18"/><line x1="10" y1="16" x2="14" y2="16"/>
            </svg>
            Zum Essensplan
          </button>
          <button class="action-btn action-btn--secondary" @click="emit('addToShoppingList')">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>
            </svg>
            Zur Einkaufsliste
          </button>
        </div>

        <!-- Danger zone -->
        <div class="danger-zone">
          <button
            v-if="!showDeleteConfirm"
            class="delete-btn"
            @click="showDeleteConfirm = true"
          >
            Rezept löschen
          </button>
          <div v-else class="delete-confirm">
            <p class="delete-confirm-text">Rezept wirklich löschen?</p>
            <div class="delete-confirm-btns">
              <button class="delete-confirm-cancel" @click="showDeleteConfirm = false">Abbrechen</button>
              <button class="delete-confirm-ok" @click="confirmDelete">Ja, löschen</button>
            </div>
          </div>
        </div>

      </div>
    </ion-content>
  </ion-modal>
</template>

<style scoped>
.detail-scroll {
  padding-bottom: calc(2rem + env(safe-area-inset-bottom, 0px));
}

/* Hero image */
.detail-hero {
  width: 100%;
  height: 220px;
  overflow: hidden;
  position: relative;
}

.detail-hero img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.detail-hero--placeholder {
  background: rgba(15, 23, 42, 0.64);
  display: flex;
  align-items: center;
  justify-content: center;
}

.detail-hero-emoji {
  font-size: 4.25rem;
  opacity: 0.4;
}

/* Header */
.detail-header {
  padding: 1.25rem 1.25rem 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
}

.detail-title-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
}

.detail-title {
  font-size: 1.75rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--app-text);
  margin: 0;
  flex: 1;
}

.detail-fav-btn {
  font-size: 1.75rem;
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

.detail-fav-btn--active { color: #fbbf24; }
.detail-fav-btn:active { transform: scale(1.25); }

.detail-meta-row {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.detail-meta-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 1.03rem;
  font-weight: 600;
  color: var(--app-text-muted);
  background: rgba(30, 41, 59, 0.8);
  border: 1px solid rgba(71, 85, 105, 0.5);
  border-radius: 9999px;
  padding: 0.25rem 0.625rem;
}

.detail-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
}

.detail-tag {
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  font-size: 1rem;
  font-weight: 600;
  padding: 0.2rem 0.6rem;
  border-radius: 9999px;
  border: 1px solid transparent;
}

/* Sections */
.detail-section {
  padding: 1.25rem 1.25rem 0;
}

.detail-section-title {
  font-size: 0.97rem;
  font-weight: 700;
  color: var(--app-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.07em;
  margin: 0 0 0.875rem;
}

/* Ingredients */
.ingredient-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0;
}

.ingredient-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.625rem 0;
  border-bottom: 1px solid rgba(51, 65, 85, 0.5);
}

.ingredient-item:last-child { border-bottom: none; }

.ingredient-amount {
  font-size: 1.0625rem;
  font-weight: 600;
  color: var(--app-primary);
  white-space: nowrap;
  min-width: 4rem;
}

.ingredient-name {
  font-size: 1.15rem;
  color: var(--app-text);
}

/* Instructions */
.detail-instructions {
  font-size: 1.1875rem;
  line-height: 1.65;
  color: rgba(248, 250, 252, 0.85);
  margin: 0;
  white-space: pre-line;
}

/* Action buttons */
.detail-actions {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
  padding: 1.5rem 1.25rem 0.5rem;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.875rem;
  border-radius: 1rem;
  font-family: var(--ion-font-family);
  font-size: 1.1875rem;
  font-weight: 700;
  border: none;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: background 0.14s, transform 0.1s;
}

.action-btn:active { transform: scale(0.98); }

.action-btn--primary {
  background: var(--app-primary);
  color: #fff;
}
.action-btn--primary:active { background: var(--app-primary-strong); }

.action-btn--secondary {
  background: rgba(30, 41, 59, 0.92);
  color: var(--app-text);
  border: 1px solid rgba(71, 85, 105, 0.6);
}
.action-btn--secondary:active { background: rgba(30, 41, 59, 1); }

/* Danger zone */
.danger-zone {
  padding: 1rem 1.25rem 0;
}

.delete-btn {
  background: transparent;
  border: none;
  color: #f87171;
  font-family: var(--ion-font-family);
  font-size: 1.125rem;
  font-weight: 600;
  cursor: pointer;
  padding: 0.5rem 0;
  -webkit-tap-highlight-color: transparent;
  opacity: 0.7;
  transition: opacity 0.12s;
}
.delete-btn:active { opacity: 1; }

.delete-confirm {
  background: rgba(239, 68, 68, 0.08);
  border: 1px solid rgba(239, 68, 68, 0.25);
  border-radius: 0.875rem;
  padding: 0.875rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
}

.delete-confirm-text {
  font-size: 1.125rem;
  font-weight: 600;
  color: #f87171;
  margin: 0;
}

.delete-confirm-btns {
  display: flex;
  gap: 0.5rem;
}

.delete-confirm-cancel,
.delete-confirm-ok {
  flex: 1;
  padding: 0.5rem;
  border-radius: 0.625rem;
  font-family: var(--ion-font-family);
  font-size: 1.125rem;
  font-weight: 600;
  cursor: pointer;
  border: none;
  -webkit-tap-highlight-color: transparent;
}

.delete-confirm-cancel {
  background: rgba(71, 85, 105, 0.3);
  color: var(--app-text-muted);
}

.delete-confirm-ok {
  background: rgba(239, 68, 68, 0.25);
  color: #f87171;
  border: 1px solid rgba(239, 68, 68, 0.35);
}
</style>

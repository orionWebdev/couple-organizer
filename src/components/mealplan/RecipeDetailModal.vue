<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { Recipe, RecipeIngredient } from '@/types'
import BottomSheet from '@/components/ui/BottomSheet.vue'

const props = defineProps<{
  isOpen: boolean
  recipe: Recipe | null
}>()

const emit = defineEmits<{ close: [] }>()

// Nur eine Kochsession lang gemerkt — jedes Öffnen startet mit leerer Liste.
const checked = ref<Set<number>>(new Set())

watch(() => props.isOpen, (open) => {
  if (open) checked.value = new Set()
})

function toggle(idx: number) {
  const next = new Set(checked.value)
  if (next.has(idx)) next.delete(idx)
  else next.add(idx)
  checked.value = next
}

function ingredientLabel(ing: RecipeIngredient): string {
  if (ing.amount == null) return ing.name
  const amount = `${ing.amount}${ing.unit ?? ''}`
  return `${amount} ${ing.name}`
}

const hasNutrition = computed(() => !!props.recipe?.nutrition)
</script>

<template>
  <BottomSheet :isOpen="isOpen" @close="emit('close')">
    <template v-if="recipe">
      <div class="modal-header">
        <h2 class="modal-title">{{ recipe.title }}</h2>
        <span v-if="recipe.minutes" class="modal-time">⏱ {{ recipe.minutes }} Min</span>
      </div>

      <div v-if="hasNutrition && recipe.nutrition" class="nutrition-grid">
        <div class="nutrition-tile">
          <span class="nutrition-value">{{ recipe.nutrition.kcal }}</span>
          <span class="nutrition-label">kcal</span>
        </div>
        <div class="nutrition-tile">
          <span class="nutrition-value">{{ recipe.nutrition.protein }}g</span>
          <span class="nutrition-label">Protein</span>
        </div>
        <div class="nutrition-tile">
          <span class="nutrition-value">{{ recipe.nutrition.carbs }}g</span>
          <span class="nutrition-label">KH</span>
        </div>
        <div class="nutrition-tile">
          <span class="nutrition-value">{{ recipe.nutrition.fat }}g</span>
          <span class="nutrition-label">Fett</span>
        </div>
      </div>

      <div class="modal-columns">
        <div class="modal-col">
          <div class="col-label">Zutaten</div>
          <div v-if="recipe.ingredients.length === 0" class="col-empty">Keine Angaben</div>
          <div v-else class="ingredient-list">
            <button
              v-for="(ing, idx) in recipe.ingredients"
              :key="idx"
              type="button"
              class="ingredient-row"
              @click="toggle(idx)"
            >
              <span class="ingredient-box" :class="{ 'ingredient-box--checked': checked.has(idx) }">
                <svg v-if="checked.has(idx)" width="10" height="10" viewBox="0 0 12 12" fill="none">
                  <path d="M1.5 6l3 3 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </span>
              <span class="ingredient-text" :class="{ 'ingredient-text--checked': checked.has(idx) }">
                {{ ingredientLabel(ing) }}
              </span>
            </button>
          </div>
        </div>

        <div class="modal-col">
          <div class="col-label">Zubereitung</div>
          <div v-if="recipe.steps.length === 0" class="col-empty">Keine Angaben</div>
          <div v-else class="steps-list">
            <div v-for="(step, i) in recipe.steps" :key="i" class="step-row">
              <span class="step-num">{{ i + 1 }}</span>
              <span class="step-text">{{ step }}</span>
            </div>
          </div>
        </div>
      </div>
    </template>
  </BottomSheet>
</template>

<style scoped>
.modal-header {
  padding-right: 40px;
}

.modal-title {
  font-family: var(--font-headline);
  font-size: 19px;
  font-weight: 700;
  color: var(--text);
  margin: 0;
}

.modal-time {
  display: block;
  font-size: 11.5px;
  font-weight: 600;
  color: var(--text-secondary);
  margin-top: 2px;
}

.nutrition-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
  margin-top: 14px;
}

.nutrition-tile {
  background: var(--food-tint);
  border-radius: 12px;
  padding: 8px 4px;
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.nutrition-value {
  font-family: var(--font-headline);
  font-size: 13px;
  font-weight: 700;
  color: var(--text);
}

.nutrition-label {
  font-size: 9px;
  font-weight: 600;
  color: #9a8272;
}

.modal-columns {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  margin-top: 16px;
}

.col-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  color: var(--text-meta);
  margin-bottom: 8px;
}

.col-empty {
  font-size: 11.5px;
  color: var(--text-faint);
}

.ingredient-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ingredient-row {
  display: flex;
  align-items: flex-start;
  gap: 7px;
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  text-align: left;
}

.ingredient-box {
  width: 17px;
  height: 17px;
  border-radius: 6px;
  border: 2px solid var(--border);
  background: var(--surface);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  flex-shrink: 0;
  margin-top: 1px;
  transition: all 0.15s;
}

.ingredient-box--checked {
  border-color: var(--food);
  background: var(--food);
}

.ingredient-text {
  font-size: 11.5px;
  font-weight: 600;
  color: #3a332c;
  line-height: 1.35;
}

.ingredient-text--checked {
  color: var(--text-faint);
  text-decoration: line-through;
}

.steps-list {
  display: flex;
  flex-direction: column;
  gap: 9px;
}

.step-row {
  display: flex;
  gap: 7px;
}

.step-num {
  width: 17px;
  height: 17px;
  border-radius: 50%;
  background: var(--food);
  color: #fff;
  font-size: 9px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 1px;
}

.step-text {
  font-size: 11.5px;
  font-weight: 600;
  line-height: 1.4;
  color: #4a413a;
}
</style>

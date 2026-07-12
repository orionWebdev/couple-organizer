<script setup lang="ts">
import { computed } from 'vue'
import type { MealPlanEntry, Recipe } from '@/types'
import { weekdayLabel, dayMonthLabel } from '@/utils/mealplan'
import { primaryTagMeta, recipeTagDef } from '@/utils/recipeTags'

const props = defineProps<{
  date: Date
  dateKey: string
  entry: MealPlanEntry | null
  recipe: Recipe | null
}>()

const emit = defineEmits<{
  addRecipe: [dateKey: string]
  remove: [entryId: string]
  open: [recipe: Recipe]
}>()

const icon = computed(() => (props.recipe ? primaryTagMeta(props.recipe.tags) : null))

const metaLabel = computed(() => {
  if (!props.recipe) return ''
  const parts: string[] = []
  if (props.recipe.minutes) parts.push(`${props.recipe.minutes} Min`)
  const tagLabel = recipeTagDef(props.recipe.tags[0])?.label
  if (tagLabel) parts.push(tagLabel)
  return parts.join(' · ')
})
</script>

<template>
  <div class="day-row list-row">
    <div class="day-label">
      <span class="day-weekday">{{ weekdayLabel(date) }}</span>
      <span class="day-date">{{ dayMonthLabel(date) }}</span>
    </div>

    <button v-if="!recipe" class="day-empty" type="button" @click="emit('addRecipe', dateKey)">
      + Rezept hinzufügen
    </button>
    <div v-else class="day-filled" @click="emit('open', recipe)">
      <span class="recipe-icon" :style="{ background: icon?.color }">{{ icon?.emoji }}</span>
      <div class="recipe-text">
        <span class="recipe-title">{{ recipe.title }}</span>
        <span v-if="metaLabel" class="recipe-meta">{{ metaLabel }}</span>
      </div>
      <button class="remove-btn" type="button" @click.stop="emit('remove', entry!.id)">×</button>
    </div>
  </div>
</template>

<style scoped>
.day-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 9px 13px;
  margin-bottom: 9px;
  min-height: 54px;
  background: var(--surface);
  border: 1px solid var(--border-softer);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-card);
}

.day-label {
  flex-shrink: 0;
  width: 40px;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.day-weekday {
  font-size: 13px;
  font-weight: 700;
  color: var(--text);
}

.day-date {
  font-size: 10.5px;
  color: var(--text-faint);
}

.day-empty {
  flex: 1;
  padding: 10px 0;
  background: transparent;
  border: 1.5px dashed var(--border);
  border-radius: 12px;
  color: var(--accent);
  font-family: var(--font-body);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: border-color 0.15s ease, background 0.15s ease;
}

.day-empty:active {
  background: var(--accent-tint);
  border-color: var(--accent);
}

.day-filled {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
}

.recipe-icon {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--food-tint);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
}

.recipe-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.recipe-title {
  font-size: 13.5px;
  font-weight: 700;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.recipe-meta {
  font-size: 11px;
  color: var(--text-meta);
}

.remove-btn {
  flex-shrink: 0;
  background: none;
  border: none;
  color: var(--text-faint);
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
  padding: 4px 6px;
  opacity: 0.6;
}
</style>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Couple, Recipe } from '@/types'
import { useMealPlan } from '@/composables/useMealPlan'
import { useShopping } from '@/composables/useShopping'
import { showToast } from '@/composables/useToast'
import MealPlanDayRow from './MealPlanDayRow.vue'
import RecipeSuggestSheet from './RecipeSuggestSheet.vue'
import RecipeDetailModal from './RecipeDetailModal.vue'

const props = defineProps<{
  coupleId: string | null
  couple: Couple | null
}>()

const emit = defineEmits<{ back: [] }>()

const coupleIdRef = computed(() => props.coupleId)

const { week, loading, suggestRecipes, assignRecipe, removeAssignment } = useMealPlan(coupleIdRef)
const { activeListId, addItem: addShoppingItem } = useShopping(coupleIdRef)

const hasAnyRecipe = computed(() => week.value.some((d) => d.recipe))

const showSheet = ref(false)
const suggestDateKey = ref<string | null>(null)

const detailRecipe = ref<Recipe | null>(null)
const showDetail = ref(false)

function openDetail(recipe: Recipe) {
  detailRecipe.value = recipe
  showDetail.value = true
}

const weekForSheet = computed(() => week.value.map((d) => ({
  date: d.date,
  dateKey: d.dateKey,
  recipeTitle: d.recipe?.title ?? null,
})))

function openSuggest(dateKey?: string) {
  suggestDateKey.value = dateKey ?? week.value.find((d) => !d.recipe)?.dateKey ?? week.value[0]?.dateKey ?? null
  showSheet.value = true
}

async function handleRemove(entryId: string) {
  const ok = await removeAssignment(entryId)
  if (!ok) showToast('Fehler beim Entfernen')
}

function onAssigned(success: boolean) {
  showSheet.value = false
  showToast(success ? 'Rezept eingeplant' : 'Fehler beim Einplanen')
}

interface AggregatedIngredient { name: string; amount?: number; unit?: string }

function aggregateIngredients(): AggregatedIngredient[] {
  const map = new Map<string, AggregatedIngredient>()
  for (const day of week.value) {
    if (!day.recipe) continue
    for (const ing of day.recipe.ingredients) {
      const key = `${ing.name.trim().toLowerCase()}__${(ing.unit ?? '').trim().toLowerCase()}`
      const existing = map.get(key)
      if (existing && typeof existing.amount === 'number' && typeof ing.amount === 'number') {
        existing.amount += ing.amount
      } else if (!existing) {
        map.set(key, { name: ing.name.trim(), amount: ing.amount, unit: ing.unit })
      }
    }
  }
  return [...map.values()]
}

async function handleCreateShoppingList() {
  const ingredients = aggregateIngredients()
  if (ingredients.length === 0) return
  if (!activeListId.value) {
    showToast('Bitte zuerst eine Einkaufsliste anlegen')
    return
  }
  for (const ing of ingredients) {
    await addShoppingItem({ listId: activeListId.value, name: ing.name, amount: ing.amount, unit: ing.unit })
  }
  showToast('Einkaufsliste aktualisiert')
}
</script>

<template>
  <div class="essensplan">
    <div class="detail-nav">
      <button class="back-btn" @click="emit('back')">‹ Zurück</button>
      <div class="nav-title-block">
        <h2 class="detail-title">Essensplan</h2>
        <span class="detail-sub">Diese Woche · Gemeinsam</span>
      </div>
    </div>

    <div class="essensplan-scroll">
      <button class="suggest-card" type="button" @click="openSuggest()">
        <span class="suggest-icon">✨</span>
        <div class="suggest-text">
          <span class="suggest-title">Rezept vorschlagen lassen</span>
          <span class="suggest-sub">Idee für einen Tag? Frag einfach</span>
        </div>
        <span class="suggest-chevron">›</span>
      </button>

      <div v-if="loading" class="loading-msg">Laden…</div>
      <div v-else class="day-list">
        <MealPlanDayRow
          v-for="day in week"
          :key="day.dateKey"
          :date="day.date"
          :dateKey="day.dateKey"
          :entry="day.entry"
          :recipe="day.recipe"
          @addRecipe="openSuggest"
          @remove="handleRemove"
          @open="openDetail"
        />
      </div>
    </div>

    <div class="cta-wrap">
      <button class="btn-primary" :disabled="!hasAnyRecipe" @click="handleCreateShoppingList">
        🛒 Einkaufsliste aus Plan erstellen
      </button>
    </div>

    <RecipeSuggestSheet
      :isOpen="showSheet"
      :week="weekForSheet"
      :initialDateKey="suggestDateKey"
      :suggest="suggestRecipes"
      :assign="assignRecipe"
      @close="showSheet = false"
      @assigned="onAssigned"
    />

    <RecipeDetailModal
      :isOpen="showDetail"
      :recipe="detailRecipe"
      @close="showDetail = false"
    />
  </div>
</template>

<style scoped>
.essensplan {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.detail-nav {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: calc(var(--safe-top) + 16px) var(--screen-pad) 16px;
}

.back-btn {
  background: var(--surface);
  border: none;
  color: var(--text);
  font-family: var(--font-body);
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  padding: 8px 14px;
  border-radius: 12px;
  box-shadow: var(--shadow-float);
  flex-shrink: 0;
}

.nav-title-block {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.detail-title {
  font-family: var(--font-headline);
  font-size: 19px;
  font-weight: 700;
  color: var(--text);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.detail-sub {
  font-size: 12px;
  color: var(--text-meta);
}

.essensplan-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 0 var(--screen-pad);
}

.suggest-card {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 14px 16px;
  margin-bottom: 16px;
  background: var(--einkauf-tint);
  border: 1px solid rgba(255, 255, 255, 0.55);
  border-radius: var(--radius-card-lg);
  cursor: pointer;
  text-align: left;
}

.suggest-icon {
  flex-shrink: 0;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: var(--einkauf);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
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
  color: var(--text);
}

.suggest-sub {
  font-size: 11.5px;
  color: var(--text-secondary);
}

.suggest-chevron {
  font-size: 20px;
  color: var(--text-faint);
  flex-shrink: 0;
}

.loading-msg {
  padding: 40px var(--screen-pad);
  font-size: 14px;
  color: var(--text-faint);
  text-align: center;
}

.day-list {
  padding-bottom: 12px;
}

.cta-wrap {
  padding: 12px var(--screen-pad) calc(20px + var(--safe-bottom));
}
</style>

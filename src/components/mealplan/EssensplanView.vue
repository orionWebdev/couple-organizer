<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Couple, Recipe } from '@/types'
import { useMealPlan, type WeekPlanDay } from '@/composables/useMealPlan'
import { useShopping } from '@/composables/useShopping'
import { showToast } from '@/composables/useToast'
import { showPaywall } from '@/composables/usePaywall'
import MealPlanDayRow from './MealPlanDayRow.vue'
import RecipeSuggestSheet from './RecipeSuggestSheet.vue'
import AiRecipeSheet from './AiRecipeSheet.vue'
import WeekAutopilotSheet from './WeekAutopilotSheet.vue'
import RecipeDetailModal from './RecipeDetailModal.vue'
import AiButton from '@/components/ai/AiButton.vue'
import AiActionSheet, { type AiActionItem } from '@/components/ai/AiActionSheet.vue'

const props = defineProps<{
  coupleId: string | null
  couple: Couple | null
}>()

const coupleIdRef = computed(() => props.coupleId)

const { week, weekLabel, isCurrentWeek, shiftWeek, resetWeek, recipes, loading, canCreateRecipe, canPlanWeek, suggestRecipes, planWeek, applyWeekPlan, assignRecipe, assignExistingRecipe, removeAssignment } = useMealPlan(coupleIdRef)
const { activeListId, addItem: addShoppingItem } = useShopping(coupleIdRef)

const hasAnyRecipe = computed(() => week.value.some((d) => d.recipe))

// assignRecipe legt immer ein neues Rezept-Doc an und fällt damit unters
// Rezept-Limit. Die Sheets bekommen deshalb diese Hülle statt assignRecipe
// direkt — sonst schlüge das Zuweisen still fehl.
async function assignWithPaywall(dateKey: string, input: Parameters<typeof assignRecipe>[1]) {
  if (!canCreateRecipe.value) {
    showPaywall('recipeCount')
    return false
  }
  return assignRecipe(dateKey, input)
}

// Tages-Schnellzuweisung (Klick auf einen leeren Tag): reiner Text oder
// Auswahl aus der bestehenden Rezept-Sammlung — keine KI hier.
const showSheet = ref(false)
const suggestDateKey = ref<string | null>(null)

// Separates KI-Modal ("Rezept vorschlagen lassen"): freie Beschreibung,
// eigener animierter Ladezustand — bewusst getrennt von der Tages-Sheet oben.
const showAiModal = ref(false)

// Wochen-Autopilot (TwoDo Plus): plant die ganze Woche auf einen Tap. Gate
// vorab, damit die Paywall statt der Konfig-Maske aufgeht.
const showAutopilot = ref(false)

function openAutopilot() {
  if (!canPlanWeek.value) {
    showPaywall('weekPlan')
    return
  }
  showAutopilot.value = true
}

async function onWeekApplied(payload: { count: number; days: WeekPlanDay[]; createList: boolean }) {
  showAutopilot.value = false
  const { count, days, createList } = payload
  let msg = count > 0 ? `Wochenplan eingeplant (${count} ${count === 1 ? 'Tag' : 'Tage'})` : 'Es wurde nichts eingeplant'

  // Einkaufsliste direkt aus den geplanten Vorschlägen bauen — nicht aus dem
  // reaktiven `week`, das nach dem Schreiben erst per Snapshot nachzieht.
  if (createList && count > 0) {
    const res = await writeIngredientsToList(mergeIngredients(days.flatMap((d) => d.suggestion.ingredients)))
    if (res === 'ok') msg += ' · Einkaufsliste aktualisiert'
    else if (res === 'no-list') msg += ' · keine aktive Einkaufsliste'
  }
  showToast(msg)
}

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

const defaultSuggestDateKey = computed(() =>
  week.value.find((d) => !d.recipe)?.dateKey ?? week.value[0]?.dateKey ?? null
)

function openDaySuggest(dateKey: string) {
  suggestDateKey.value = dateKey
  showSheet.value = true
}

function openAiModal() {
  showAiModal.value = true
}

// Ein KI-Einstieg für die Küche → Aktions-Sheet mit den zwei KI-Aktionen.
const showAiActions = ref(false)
const aiActions: AiActionItem[] = [
  { key: 'week', icon: '🪄', title: 'Ganze Woche planen', subtitle: '7 Abendessen als kompletter Vorschlag' },
  { key: 'recipe', icon: '✨', title: 'Rezept vorschlagen', subtitle: 'Eine Idee für heute Abend' },
]

function onAiAction(key: string) {
  showAiActions.value = false
  if (key === 'week') openAutopilot()
  else openAiModal()
}

async function handleRemove(entryId: string) {
  const ok = await removeAssignment(entryId)
  if (!ok) showToast('Fehler beim Entfernen')
}

function onAssigned(success: boolean) {
  showSheet.value = false
  showAiModal.value = false
  showToast(success ? 'Rezept eingeplant' : 'Fehler beim Einplanen')
}

interface AggregatedIngredient { name: string; amount?: number; unit?: string }

// Gleiche Zutaten (name + unit) zusammenfassen — genutzt vom Wochenplan-Button
// (aus den geplanten Rezepten) und vom Autopilot (aus den KI-Vorschlägen).
function mergeIngredients(items: readonly { name: string; amount?: number; unit?: string }[]): AggregatedIngredient[] {
  const map = new Map<string, AggregatedIngredient>()
  for (const ing of items) {
    const key = `${ing.name.trim().toLowerCase()}__${(ing.unit ?? '').trim().toLowerCase()}`
    const existing = map.get(key)
    if (existing && typeof existing.amount === 'number' && typeof ing.amount === 'number') {
      existing.amount += ing.amount
    } else if (!existing) {
      map.set(key, { name: ing.name.trim(), amount: ing.amount, unit: ing.unit })
    }
  }
  return [...map.values()]
}

// Schreibt Zutaten in die aktive Liste. Kein Toast hier — der Aufrufer
// formuliert die Meldung (der Autopilot hängt sie an seine eigene an).
async function writeIngredientsToList(
  ingredients: AggregatedIngredient[]
): Promise<'ok' | 'empty' | 'no-list'> {
  if (ingredients.length === 0) return 'empty'
  if (!activeListId.value) return 'no-list'
  for (const ing of ingredients) {
    await addShoppingItem({ listId: activeListId.value, name: ing.name, amount: ing.amount, unit: ing.unit, merge: true })
  }
  return 'ok'
}

async function handleCreateShoppingList() {
  const res = await writeIngredientsToList(mergeIngredients(week.value.flatMap((d) => d.recipe?.ingredients ?? [])))
  if (res === 'no-list') showToast('Bitte zuerst eine Einkaufsliste anlegen')
  else if (res === 'ok') showToast('Einkaufsliste aktualisiert')
}
</script>

<template>
  <div class="essensplan">
    <div class="essensplan-scroll">
      <!-- Wochennavigation: vergangene/kommende Wochen sind weiter erreichbar,
           die Pläne liegen ohnehin dauerhaft in Firestore. -->
      <div class="week-nav">
        <button class="week-arrow" type="button" aria-label="Vorige Woche" @click="shiftWeek(-1)">‹</button>
        <button
          class="week-label"
          type="button"
          :class="{ 'week-label--past': !isCurrentWeek }"
          @click="resetWeek"
        >
          {{ weekLabel }}
          <span v-if="!isCurrentWeek" class="week-today-hint">· heute</span>
        </button>
        <button class="week-arrow" type="button" aria-label="Nächste Woche" @click="shiftWeek(1)">›</button>
      </div>

      <AiButton
        title="TwoDo KI"
        subtitle="Wochenplan & Rezepte vorschlagen"
        @click="showAiActions = true"
      />

      <div v-if="loading" class="loading-msg">Laden…</div>
      <div v-else class="day-list">
        <MealPlanDayRow
          v-for="day in week"
          :key="day.dateKey"
          :date="day.date"
          :dateKey="day.dateKey"
          :entry="day.entry"
          :recipe="day.recipe"
          @addRecipe="openDaySuggest"
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

    <AiActionSheet
      :isOpen="showAiActions"
      :actions="aiActions"
      @select="onAiAction"
      @close="showAiActions = false"
    />

    <RecipeSuggestSheet
      :isOpen="showSheet"
      :week="weekForSheet"
      :initialDateKey="suggestDateKey"
      :recipes="recipes"
      :assign="assignWithPaywall"
      :assignExisting="assignExistingRecipe"
      @close="showSheet = false"
      @assigned="onAssigned"
    />

    <AiRecipeSheet
      :isOpen="showAiModal"
      :week="weekForSheet"
      :initialDateKey="defaultSuggestDateKey"
      :suggest="suggestRecipes"
      :assign="assignWithPaywall"
      @close="showAiModal = false"
      @assigned="onAssigned"
    />

    <WeekAutopilotSheet
      :isOpen="showAutopilot"
      :week="weekForSheet"
      :plan="planWeek"
      :apply="applyWeekPlan"
      @close="showAutopilot = false"
      @applied="onWeekApplied"
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

.essensplan-scroll {
  flex: 1;
  overflow-y: auto;
  /* Nur vertikal scrollen — horizontale Gesten gehören dem Tab-Swipe. */
  touch-action: pan-y;
  padding: 0 var(--screen-pad);
}

/* Wochennavigation */
.week-nav {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 0 14px;
}

.week-arrow {
  flex: none;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border-softer);
  border-radius: 12px;
  background: var(--surface);
  color: var(--text-secondary);
  font-size: 22px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: var(--shadow-card);
}

.week-arrow:active {
  transform: scale(0.94);
}

.week-label {
  flex: 1;
  min-width: 0;
  height: 40px;
  border: none;
  background: transparent;
  font-family: var(--font-headline);
  font-size: 16px;
  font-weight: 700;
  color: var(--text);
  cursor: pointer;
}

.week-label--past {
  color: var(--accent);
}

.week-today-hint {
  font-family: var(--font-body);
  font-size: 12px;
  font-weight: 700;
  color: var(--text-meta);
}

/* Ein KI-Einstieg (AiButton) statt der früheren zwei Gradient-Karten. */
.essensplan-scroll > .ai-btn {
  margin-bottom: 16px;
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

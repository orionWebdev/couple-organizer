<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import type { Recipe } from '@/types'
import type { AssignRecipeInput } from '@/composables/useMealPlan'
import { weekdayLabel } from '@/utils/mealplan'
import { primaryTagMeta } from '@/utils/recipeTags'

interface WeekDayLite {
  date: Date
  dateKey: string
  recipeTitle: string | null
}

const props = defineProps<{
  isOpen: boolean
  week: WeekDayLite[]
  initialDateKey: string | null
  recipes: readonly Recipe[]
  assign: (dateKey: string, input: AssignRecipeInput) => Promise<boolean>
  assignExisting: (dateKey: string, recipeId: string) => Promise<boolean>
}>()

const emit = defineEmits<{ close: []; assigned: [success: boolean] }>()

const selectedDateKey = ref('')
const manualTitle = ref('')
const showPicker = ref(false)
const pickerSearch = ref('')

watch(() => props.isOpen, (open) => {
  if (!open) return
  selectedDateKey.value = props.initialDateKey ?? props.week[0]?.dateKey ?? ''
  manualTitle.value = ''
  showPicker.value = false
  pickerSearch.value = ''
})

const selectedDay = computed(() => props.week.find((d) => d.dateKey === selectedDateKey.value) ?? null)

const filteredRecipes = computed(() => {
  const q = pickerSearch.value.trim().toLowerCase()
  if (!q) return props.recipes
  return props.recipes.filter((r) => r.title.toLowerCase().includes(q))
})

async function handleManualSubmit() {
  if (!selectedDateKey.value || !manualTitle.value.trim()) return
  const ok = await props.assign(selectedDateKey.value, {
    title: manualTitle.value.trim(),
    source: 'manual',
  })
  emit('assigned', ok)
}

async function handlePickExisting(recipe: Recipe) {
  if (!selectedDateKey.value) return
  const ok = await props.assignExisting(selectedDateKey.value, recipe.id)
  emit('assigned', ok)
}
</script>

<template>
  <BottomSheet :isOpen="isOpen" title="Rezept einplanen" @close="emit('close')">
    <div class="field-label">Für welchen Tag?</div>
    <div class="day-picker">
      <button
        v-for="d in week"
        :key="d.dateKey"
        type="button"
        class="day-pill"
        :class="{ 'day-pill--active': selectedDateKey === d.dateKey }"
        @click="selectedDateKey = d.dateKey"
      >
        {{ weekdayLabel(d.date) }}
      </button>
    </div>
    <p v-if="selectedDay?.recipeTitle" class="replace-hint">
      Ersetzt „{{ selectedDay.recipeTitle }}"
    </p>

    <template v-if="!showPicker">
      <div class="field-label query-label">Rezeptname</div>
      <div class="query-row">
        <input
          v-model="manualTitle"
          class="app-field"
          type="text"
          placeholder="z. B. Spaghetti Bolognese"
          @keyup.enter="handleManualSubmit"
        />
        <button class="btn-primary search-btn" :disabled="!manualTitle.trim()" @click="handleManualSubmit">
          Eintragen
        </button>
      </div>

      <button class="picker-toggle" type="button" @click="showPicker = true">
        📖 Aus Rezepten auswählen
      </button>
    </template>

    <template v-else>
      <div class="field-label query-label">Rezept suchen</div>
      <input
        v-model="pickerSearch"
        class="app-field pick-search"
        type="text"
        placeholder="Rezept suchen …"
      />

      <div v-if="filteredRecipes.length === 0" class="empty-hint">
        {{ recipes.length === 0 ? 'Noch keine Rezepte in eurer Sammlung.' : 'Keine Rezepte gefunden.' }}
      </div>
      <div v-else class="recipe-pick-list">
        <button
          v-for="r in filteredRecipes"
          :key="r.id"
          type="button"
          class="recipe-pick-row"
          :disabled="!selectedDateKey"
          @click="handlePickExisting(r)"
        >
          <span class="pick-icon" :style="{ background: primaryTagMeta(r.tags).color }">{{ primaryTagMeta(r.tags).emoji }}</span>
          <div class="pick-text">
            <span class="pick-title">{{ r.title }}</span>
            <span v-if="r.minutes" class="pick-meta">⏱ {{ r.minutes }} Min</span>
          </div>
        </button>
      </div>

      <button class="picker-toggle" type="button" @click="showPicker = false">
        ‹ Zurück zur Texteingabe
      </button>
    </template>
  </BottomSheet>
</template>

<style scoped>
.field-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.6px;
  text-transform: uppercase;
  color: var(--text-meta);
  margin-bottom: 7px;
}

.query-label {
  margin-top: 14px;
}

.day-picker {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 8px;
}

.day-pill {
  flex: 1;
  min-width: 38px;
  border: 1.5px solid var(--border-softer);
  background: var(--surface-deep);
  font-family: var(--font-body);
  font-size: 12.5px;
  font-weight: 700;
  padding: 8px 0;
  border-radius: 10px;
  color: var(--text-meta);
  cursor: pointer;
}

.day-pill--active {
  border-color: var(--accent);
  background: var(--accent-tint);
  color: var(--text);
}

.replace-hint {
  font-size: 11.5px;
  color: var(--danger);
  margin: 0 0 4px;
}

.query-row {
  display: flex;
  gap: 8px;
  margin-bottom: 10px;
}

.query-row .app-field {
  flex: 1;
}

.search-btn {
  width: auto;
  padding: 0 18px;
  flex-shrink: 0;
}

.picker-toggle {
  display: block;
  margin: 4px auto 0;
  background: none;
  border: none;
  color: var(--text-meta);
  font-family: var(--font-body);
  font-size: 12.5px;
  font-weight: 600;
  text-decoration: underline;
  cursor: pointer;
}

.pick-search {
  margin-bottom: 10px;
}

.empty-hint {
  font-size: 12.5px;
  color: var(--text-faint);
  text-align: center;
  padding: 12px 0;
  line-height: 1.5;
}

.recipe-pick-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 10px;
  max-height: 45vh;
  overflow-y: auto;
}

.recipe-pick-row {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  border: 1.5px solid var(--border-softer);
  background: var(--surface);
  border-radius: 12px;
  padding: 9px 12px;
  cursor: pointer;
  text-align: left;
}

.recipe-pick-row:active {
  border-color: var(--accent);
  background: var(--accent-tint);
}

.recipe-pick-row:disabled {
  opacity: 0.5;
  pointer-events: none;
}

.pick-icon {
  flex-shrink: 0;
  width: 30px;
  height: 30px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
}

.pick-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.pick-title {
  font-size: 13.5px;
  font-weight: 700;
  color: var(--text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pick-meta {
  font-size: 11px;
  color: var(--text-meta);
}
</style>

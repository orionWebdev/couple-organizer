<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import type { RecipeSuggestion } from '@/services/gemini'
import type { AssignRecipeInput } from '@/composables/useMealPlan'
import { weekdayLabel } from '@/utils/mealplan'

interface WeekDayLite {
  date: Date
  dateKey: string
  recipeTitle: string | null
}

const props = defineProps<{
  isOpen: boolean
  week: WeekDayLite[]
  initialDateKey: string | null
  suggest: (query: string, count?: number) => Promise<RecipeSuggestion[]>
  assign: (dateKey: string, input: AssignRecipeInput) => Promise<boolean>
}>()

const emit = defineEmits<{ close: []; assigned: [success: boolean] }>()

const selectedDateKey = ref('')
const query = ref('')
const loading = ref(false)
const searched = ref(false)
const suggestions = ref<RecipeSuggestion[]>([])
const showManual = ref(false)
const manualTitle = ref('')

watch(() => props.isOpen, (open) => {
  if (!open) return
  selectedDateKey.value = props.initialDateKey ?? props.week[0]?.dateKey ?? ''
  query.value = ''
  loading.value = false
  searched.value = false
  suggestions.value = []
  showManual.value = false
  manualTitle.value = ''
})

const selectedDay = computed(() => props.week.find((d) => d.dateKey === selectedDateKey.value) ?? null)

async function handleSearch() {
  if (!query.value.trim() || loading.value) return
  loading.value = true
  searched.value = true
  suggestions.value = await props.suggest(query.value.trim())
  loading.value = false
}

async function handlePick(s: RecipeSuggestion) {
  if (!selectedDateKey.value) return
  const ok = await props.assign(selectedDateKey.value, {
    title: s.title,
    description: s.description,
    minutes: s.minutes ?? null,
    servings: s.servings ?? null,
    tags: s.tags ?? [],
    ingredients: s.ingredients,
    steps: s.steps,
    nutrition: s.nutrition ?? null,
    source: 'ai',
  })
  emit('assigned', ok)
}

async function handleManualSubmit() {
  if (!selectedDateKey.value || !manualTitle.value.trim()) return
  const ok = await props.assign(selectedDateKey.value, {
    title: manualTitle.value.trim(),
    source: 'manual',
  })
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

    <div class="field-label query-label">Worauf hast du Lust?</div>
    <div class="query-row">
      <input
        v-model="query"
        class="app-field"
        type="text"
        placeholder="z. B. etwas mit Hähnchen, schnell"
        @keyup.enter="handleSearch"
      />
      <button class="btn-primary search-btn" :disabled="!query.trim() || loading" @click="handleSearch">
        {{ loading ? '…' : 'Los' }}
      </button>
    </div>

    <div v-if="searched && !loading && suggestions.length === 0" class="empty-hint">
      Keine Vorschläge gefunden — versuch's mit einer anderen Beschreibung.
    </div>

    <div v-if="suggestions.length > 0" class="suggestions">
      <button
        v-for="(s, i) in suggestions"
        :key="i"
        type="button"
        class="suggestion-card"
        :disabled="!selectedDateKey"
        @click="handlePick(s)"
      >
        <div class="suggestion-title">{{ s.title }}</div>
        <div v-if="s.minutes || s.tags?.length" class="suggestion-meta">
          <span v-if="s.minutes">{{ s.minutes }} Min</span>
          <span v-if="s.tags?.length">{{ s.tags.join(', ') }}</span>
        </div>
        <div v-if="s.description" class="suggestion-desc">{{ s.description }}</div>
      </button>
    </div>

    <button class="manual-toggle" type="button" @click="showManual = !showManual">
      {{ showManual ? 'Abbrechen' : 'oder Rezept manuell eintragen' }}
    </button>
    <div v-if="showManual" class="manual-row">
      <input
        v-model="manualTitle"
        class="app-field"
        type="text"
        placeholder="Rezeptname"
        @keyup.enter="handleManualSubmit"
      />
      <button class="btn-primary" :disabled="!manualTitle.trim()" @click="handleManualSubmit">
        Eintragen
      </button>
    </div>
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
  margin-bottom: 12px;
}

.query-row .app-field {
  flex: 1;
}

.search-btn {
  width: auto;
  padding: 0 18px;
  flex-shrink: 0;
}

.empty-hint {
  font-size: 12.5px;
  color: var(--text-faint);
  text-align: center;
  padding: 12px 0;
  line-height: 1.5;
}

.suggestions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
}

.suggestion-card {
  text-align: left;
  border: 1.5px solid var(--border-softer);
  background: var(--surface);
  border-radius: 12px;
  padding: 11px 13px;
  cursor: pointer;
}

.suggestion-card:active {
  border-color: var(--accent);
  background: var(--accent-tint);
}

.suggestion-card:disabled {
  opacity: 0.5;
  pointer-events: none;
}

.suggestion-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--text);
}

.suggestion-meta {
  display: flex;
  gap: 8px;
  font-size: 11.5px;
  color: var(--text-meta);
  margin-top: 2px;
}

.suggestion-desc {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 5px;
  line-height: 1.4;
}

.manual-toggle {
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

.manual-row {
  display: flex;
  gap: 8px;
  margin-top: 10px;
}

.manual-row .app-field {
  flex: 1;
}

.manual-row .btn-primary {
  width: auto;
  padding: 0 18px;
  flex-shrink: 0;
}
</style>

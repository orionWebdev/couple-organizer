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
const description = ref('')
const loading = ref(false)
const searched = ref(false)
const suggestions = ref<RecipeSuggestion[]>([])

watch(() => props.isOpen, (open) => {
  if (!open) return
  selectedDateKey.value = props.initialDateKey ?? props.week[0]?.dateKey ?? ''
  description.value = ''
  loading.value = false
  searched.value = false
  suggestions.value = []
})

const selectedDay = computed(() => props.week.find((d) => d.dateKey === selectedDateKey.value) ?? null)

async function handleSubmit() {
  if (!description.value.trim() || loading.value) return
  loading.value = true
  searched.value = true
  suggestions.value = []
  suggestions.value = await props.suggest(description.value.trim())
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
</script>

<template>
  <BottomSheet :isOpen="isOpen" title="✨ KI-Rezeptvorschlag" @close="emit('close')">
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

    <div class="field-label query-label">Was stellst du dir vor?</div>
    <textarea
      v-model="description"
      class="app-field ai-textarea"
      rows="3"
      placeholder="z. B. etwas Schnelles mit Hähnchen und Reis, wenig Aufwand …"
      :disabled="loading"
    />

    <button class="ai-submit-btn" :disabled="!description.trim() || loading" @click="handleSubmit">
      {{ loading ? 'Wird generiert …' : '✨ Rezepte vorschlagen' }}
    </button>

    <div v-if="loading" class="ai-loading">
      <div class="ai-loading-orb" />
      <p class="ai-loading-text">Die KI denkt sich passende Rezepte aus …</p>
    </div>

    <template v-else>
      <div v-if="searched && suggestions.length === 0" class="empty-hint">
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

.ai-textarea {
  resize: none;
  margin-bottom: 12px;
}

/* KI-Look angelehnt an Gemini: wandernder Regenbogen-Gradient + Glow. */
.ai-submit-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 13px 20px;
  margin-bottom: 12px;
  background: linear-gradient(120deg, #4285f4 0%, #9b72cb 35%, #d96570 65%, #f6b73c 100%);
  background-size: 220% 220%;
  color: #fff;
  border: none;
  border-radius: 16px;
  font-family: var(--font-body);
  font-size: 14.5px;
  font-weight: 700;
  cursor: pointer;
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.28) inset,
    0 6px 20px -4px rgba(155, 114, 203, 0.55),
    0 0 22px rgba(66, 133, 244, 0.35);
  animation: aiGradientShift 6s ease-in-out infinite;
  transition: transform 0.12s ease;
}

.ai-submit-btn:active {
  transform: scale(0.98);
}

.ai-submit-btn:disabled {
  opacity: 0.55;
  pointer-events: none;
  animation: none;
}

@keyframes aiGradientShift {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}

/* Pulsierender Lade-Zustand, während Gemini antwortet */
.ai-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 30px 10px 20px;
}

.ai-loading-orb {
  position: relative;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: linear-gradient(120deg, #4285f4 0%, #9b72cb 35%, #d96570 65%, #f6b73c 100%);
  background-size: 220% 220%;
  animation: aiOrbPulse 1.4s ease-in-out infinite, aiGradientShift 4s ease-in-out infinite;
  box-shadow: 0 0 26px rgba(155, 114, 203, 0.55);
}

.ai-loading-orb::before,
.ai-loading-orb::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: inherit;
  opacity: 0.55;
  animation: aiRingPulse 1.4s ease-out infinite;
}

.ai-loading-orb::after {
  animation-delay: 0.45s;
}

@keyframes aiOrbPulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}

@keyframes aiRingPulse {
  0% { transform: scale(1); opacity: 0.55; }
  100% { transform: scale(2.1); opacity: 0; }
}

.ai-loading-text {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-secondary);
  text-align: center;
  margin: 0;
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
</style>

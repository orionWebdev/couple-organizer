<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import type { RecipeSuggestion, AiResult, Quota } from '@/services/ai'
import type { WeekPlanDay } from '@/composables/useMealPlan'
import { weekdayLabel, dayMonthLabel } from '@/utils/mealplan'
import { showPaywall } from '@/composables/usePaywall'
import { useAiThinking } from '@/composables/useAiThinking'

const aiThinking = useAiThinking()

interface WeekDayLite {
  date: Date
  dateKey: string
  recipeTitle: string | null
}

// Wochen-Autopilot (TwoDo Plus): plant alle gewählten Kochtage in einem
// KI-Aufruf und zeigt eine Vorschau, bevor irgendetwas geschrieben wird.
const props = defineProps<{
  isOpen: boolean
  week: WeekDayLite[]
  plan: (opts: { count: number; servings?: number | null; prefs?: string }) => Promise<AiResult<RecipeSuggestion[]>>
  apply: (days: WeekPlanDay[]) => Promise<number>
}>()

const emit = defineEmits<{
  close: []
  applied: [payload: { count: number; days: WeekPlanDay[]; createList: boolean }]
}>()

type Step = 'config' | 'preview'
const step = ref<Step>('config')
const selected = ref<Set<string>>(new Set())
const prefs = ref('')
const servings = ref(2)
const previewDays = ref<WeekPlanDay[]>([])
const quota = ref<Quota | null>(null)
// Einkaufsliste gleich mitschreiben — der eigentliche "ein Tap"-Effekt.
const createList = ref(true)

watch(() => props.isOpen, (open) => {
  if (!open) return
  // Standard: die noch leeren Tage vorauswählen (Autopilot füllt Lücken, ohne
  // bestehende Planung zu überschreiben). Ist alles voll, alle Tage.
  const empty = props.week.filter((d) => !d.recipeTitle).map((d) => d.dateKey)
  selected.value = new Set(empty.length ? empty : props.week.map((d) => d.dateKey))
  prefs.value = ''
  servings.value = 2
  step.value = 'config'
  previewDays.value = []
  quota.value = null
  createList.value = true
})

const orderedSelectedKeys = computed(() =>
  props.week.filter((d) => selected.value.has(d.dateKey)).map((d) => d.dateKey)
)

const dayByKey = computed(() => new Map(props.week.map((d) => [d.dateKey, d])))

function toggleDay(key: string) {
  const next = new Set(selected.value)
  if (next.has(key)) next.delete(key)
  else next.add(key)
  selected.value = next
}

const quotaLabel = computed(() => {
  const q = quota.value
  if (!q || q.limit === 0 || q.limit > 12) return null
  return `Noch ${Math.max(0, q.limit - q.used)} von ${q.limit} Wochenplänen diesen Monat`
})

// Ganze Woche planen ist eine lange Task → immer Denk-Leiste (Progress + ETA +
// Abbrechen). Die ETA skaliert grob mit der Anzahl Tage.
async function generate() {
  const keys = orderedSelectedKeys.value
  if (!keys.length || aiThinking.busy.value) return

  const days = await aiThinking.run({
    status: 'TwoDo KI plant …',
    subtitle: `${keys.length} Abendessen`,
    short: false,
    estMs: 4000 + keys.length * 1400,
    task: runPlan,
  })
  if (days) {
    previewDays.value = days
    step.value = 'preview'
  }
}

// KI-Arbeit als task. null = Abbruch (Quota/Premium) → Paywall.
async function runPlan(): Promise<WeekPlanDay[] | null> {
  const keys = orderedSelectedKeys.value
  const result = await props.plan({ count: keys.length, servings: servings.value, prefs: prefs.value.trim() })

  if (result.kind === 'quota' || result.kind === 'premium') {
    emit('close')
    showPaywall('weekPlan')
    return null
  }

  quota.value = result.quota
  // Vorschläge in der Reihenfolge der gewählten Tage zuordnen.
  return keys
    .map((dateKey, i) => (result.data[i] ? { dateKey, suggestion: result.data[i] } : null))
    .filter((d): d is WeekPlanDay => d !== null)
}

function removeDay(dateKey: string) {
  previewDays.value = previewDays.value.filter((d) => d.dateKey !== dateKey)
}

const applying = ref(false)
async function applyPlan() {
  if (!previewDays.value.length || applying.value) return
  applying.value = true
  const applied = [...previewDays.value]
  const count = await props.apply(applied)
  applying.value = false
  emit('applied', { count, days: applied, createList: createList.value })
}
</script>

<template>
  <BottomSheet :isOpen="isOpen" title="✨ Wochen-Autopilot" @close="emit('close')">
    <div class="wa area-food">
      <!-- Schritt 1: Konfiguration -->
      <template v-if="step === 'config'">
        <div class="field-label">Welche Tage kocht ihr zuhause?</div>
        <div class="wa-day-picker">
          <button
            v-for="d in week"
            :key="d.dateKey"
            type="button"
            class="wa-day-pill"
            :class="{ 'wa-day-pill--active': selected.has(d.dateKey) }"
            @click="toggleDay(d.dateKey)"
          >
            {{ weekdayLabel(d.date) }}
          </button>
        </div>

        <div class="field-label wa-mt">Für wie viele Portionen?</div>
        <div class="wa-stepper">
          <button type="button" class="wa-step-btn" :disabled="servings <= 1" @click="servings--">–</button>
          <span class="wa-step-val">{{ servings }}</span>
          <button type="button" class="wa-step-btn" :disabled="servings >= 12" @click="servings++">+</button>
        </div>

        <div class="field-label wa-mt">Vorlieben & No-Gos (optional)</div>
        <textarea
          v-model="prefs"
          class="app-field wa-textarea"
          rows="2"
          placeholder="z. B. viel Gemüse, kein Fisch, schnell an Werktagen …"
          :disabled="aiThinking.busy.value"
        />

        <button
          class="wa-submit-btn"
          :disabled="!selected.size || aiThinking.busy.value"
          @click="generate"
        >
          ✨ {{ selected.size }} {{ selected.size === 1 ? 'Tag' : 'Tage' }} planen
        </button>
      </template>

      <!-- Schritt 2: Vorschau -->
      <template v-else>
        <p class="wa-preview-intro">Dein Wochenplan — tippe ✕, um einen Tag rauszunehmen.</p>

        <div v-if="!previewDays.length" class="empty-hint">
          Kein Tag mehr übrig. Geh zurück und plane neu.
        </div>

        <div v-else class="wa-preview-list">
          <div v-for="d in previewDays" :key="d.dateKey" class="wa-preview-card">
            <div class="wa-preview-main">
              <span class="wa-preview-day">{{ weekdayLabel(dayByKey.get(d.dateKey)!.date) }}, {{ dayMonthLabel(dayByKey.get(d.dateKey)!.date) }}</span>
              <span class="wa-preview-title">{{ d.suggestion.title }}</span>
              <span v-if="d.suggestion.minutes || d.suggestion.tags?.length" class="wa-preview-meta">
                <template v-if="d.suggestion.minutes">{{ d.suggestion.minutes }} Min</template>
                <template v-if="d.suggestion.tags?.length"> · {{ d.suggestion.tags.join(', ') }}</template>
              </span>
              <span v-if="dayByKey.get(d.dateKey)!.recipeTitle" class="wa-replace-hint">
                Ersetzt „{{ dayByKey.get(d.dateKey)!.recipeTitle }}"
              </span>
            </div>
            <button type="button" class="wa-remove" aria-label="Tag entfernen" @click="removeDay(d.dateKey)">✕</button>
          </div>
        </div>

        <label v-if="previewDays.length" class="wa-list-toggle">
          <input type="checkbox" v-model="createList" />
          <span>🛒 Einkaufsliste gleich mit erstellen</span>
        </label>

        <button class="btn-primary wa-apply" :disabled="!previewDays.length || applying" @click="applyPlan">
          {{ applying ? 'Wird eingeplant …' : `Woche übernehmen (${previewDays.length})` }}
        </button>
        <button class="wa-back" type="button" @click="step = 'config'">‹ Ändern & neu planen</button>

        <p v-if="quotaLabel" class="quota-hint">{{ quotaLabel }}</p>
      </template>
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

.wa-mt {
  margin-top: 16px;
}

.wa-day-picker {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.wa-day-pill {
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

.wa-day-pill--active {
  border-color: var(--accent);
  background: var(--accent-tint);
  color: var(--text);
}

.wa-stepper {
  display: flex;
  align-items: center;
  gap: 16px;
}

.wa-step-btn {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  border: 1.5px solid var(--border-softer);
  background: var(--surface-deep);
  font-size: 20px;
  font-weight: 700;
  color: var(--text-secondary);
  cursor: pointer;
}

.wa-step-btn:disabled {
  opacity: 0.4;
  pointer-events: none;
}

.wa-step-val {
  font-family: var(--font-headline);
  font-size: 18px;
  font-weight: 700;
  color: var(--text);
  min-width: 22px;
  text-align: center;
}

.wa-textarea {
  resize: none;
  margin-bottom: 4px;
}

/* KI-Look angelehnt an Gemini: wandernder Regenbogen-Gradient + Glow. */
.wa-submit-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 13px 20px;
  margin-top: 18px;
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

.wa-submit-btn:active {
  transform: scale(0.98);
}

.wa-submit-btn:disabled {
  opacity: 0.55;
  pointer-events: none;
  animation: none;
}

@keyframes aiGradientShift {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}

.wa-preview-intro {
  font-size: 12.5px;
  color: var(--text-secondary);
  margin: 0 0 12px;
}

.wa-preview-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.wa-preview-card {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  border: 1.5px solid var(--border-softer);
  background: var(--surface);
  border-radius: 12px;
  padding: 11px 13px;
}

.wa-preview-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.wa-preview-day {
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.4px;
  text-transform: uppercase;
  color: var(--accent);
}

.wa-preview-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--text);
}

.wa-preview-meta {
  font-size: 11.5px;
  color: var(--text-meta);
}

.wa-replace-hint {
  font-size: 11px;
  color: var(--danger);
  margin-top: 2px;
}

.wa-remove {
  flex-shrink: 0;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  border: none;
  background: var(--surface-deep);
  color: var(--text-meta);
  font-size: 12px;
  cursor: pointer;
}

.wa-list-toggle {
  display: flex;
  align-items: center;
  gap: 9px;
  margin-top: 16px;
  padding: 11px 13px;
  border: 1.5px solid var(--border-softer);
  border-radius: 12px;
  background: var(--surface);
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
  cursor: pointer;
}

.wa-list-toggle input {
  width: 18px;
  height: 18px;
  accent-color: var(--accent);
  flex-shrink: 0;
}

.wa-apply {
  margin-top: 12px;
}

.wa-back {
  display: block;
  margin: 10px auto 0;
  background: none;
  border: none;
  color: var(--text-meta);
  font-family: var(--font-body);
  font-size: 12.5px;
  font-weight: 600;
  text-decoration: underline;
  cursor: pointer;
}

.quota-hint {
  margin-top: 12px;
  text-align: center;
  font-size: 12px;
  color: var(--text-meta);
}

.empty-hint {
  font-size: 12.5px;
  color: var(--text-faint);
  text-align: center;
  padding: 12px 0;
  line-height: 1.5;
}
</style>

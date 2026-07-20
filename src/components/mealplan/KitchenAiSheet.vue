<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import AiThinkingRow from '@/components/ai/AiThinkingRow.vue'
import type { RecipeSuggestion, AiResult } from '@/services/ai'
import type { WeekPlanDay, AssignRecipeInput } from '@/composables/useMealPlan'
import { weekdayLabel, dayMonthLabel, dateKey as toDateKey } from '@/utils/mealplan'
import { showPaywall } from '@/composables/usePaywall'
import { useAiThinking } from '@/composables/useAiThinking'

interface WeekDayLite {
  date: Date
  dateKey: string
  recipeTitle: string | null
}

// Der KI-Einstieg der Küche. Ablauf in EINEM Sheet: Aktion wählen → konfigurieren
// (Wochentag/Tage + Prompt) → das Sheet selbst wird zum Denk-Zustand (glüht,
// §4·PRIMÄR/§7) → Rezept: Vorschlag auswählen · Woche: Vorschau → Bloom → fertig.
const props = defineProps<{
  isOpen: boolean
  week: WeekDayLite[]
  canPlanWeek: boolean
  plan: (opts: { count: number; servings?: number | null; prefs?: string }) => Promise<AiResult<RecipeSuggestion[]>>
  apply: (days: WeekPlanDay[]) => Promise<number>
  suggest: (query: string, count?: number) => Promise<AiResult<RecipeSuggestion[]>>
  assign: (dateKey: string, input: AssignRecipeInput) => Promise<boolean>
}>()

const emit = defineEmits<{
  close: []
  applied: [payload: { count: number; days: WeekPlanDay[]; createList: boolean }]
  assigned: [ok: boolean]
}>()

const { runTask, playBloom } = useAiThinking()

type Mode = 'actions' | 'config' | 'thinking' | 'suggestions' | 'preview'
const mode = ref<Mode>('actions')
const action = ref<'week' | 'recipe'>('week')

// Rezept-Config
const selectedDateKey = ref('')
const description = ref('')
const suggestions = ref<RecipeSuggestion[]>([])

// Wochen-Config
const selectedDays = ref<Set<string>>(new Set())
const servings = ref(2)
const prefs = ref('')
const previewDays = ref<WeekPlanDay[]>([])
const createList = ref(true)
const applying = ref(false)

const dayByKey = computed(() => new Map(props.week.map((d) => [d.dateKey, d])))
const selectedDay = computed(() => dayByKey.value.get(selectedDateKey.value) ?? null)
const orderedSelectedKeys = computed(() => props.week.filter((d) => selectedDays.value.has(d.dateKey)).map((d) => d.dateKey))

// Abbrechen während des Denkens: der laufende Netz-Call lässt sich nicht wirklich
// stoppen, aber sein Ergebnis wird über den Token verworfen und das Sheet kehrt
// sofort zum Config-Schritt zurück.
let runToken = 0
function cancelThinking() {
  runToken++
  mode.value = 'config'
}

watch(() => props.isOpen, (open) => {
  if (!open) return
  mode.value = 'actions'
  suggestions.value = []
  previewDays.value = []
  createList.value = true
  applying.value = false
})

const thinkingCopy = computed(() =>
  action.value === 'week'
    ? { icon: '🪄', status: 'Plant eure Woche …', subtitle: '7 Abendessen werden zusammengestellt' }
    : { icon: '✨', status: 'Sucht ein Rezept …', subtitle: 'Passend zu deinen Wünschen' },
)

const sheetTitle = computed(() => {
  if (mode.value === 'thinking') return undefined
  if (mode.value === 'actions') return 'Was soll die KI tun?'
  if (mode.value === 'config') return action.value === 'week' ? '🪄 Ganze Woche planen' : '✨ Rezept vorschlagen'
  if (mode.value === 'suggestions') return '✨ Vorschläge'
  return undefined // preview hat eigenen Kopf
})

// ── Aktion wählen → Config ───────────────────────────────────
function selectAction(a: 'week' | 'recipe') {
  if (a === 'week' && !props.canPlanWeek) {
    showPaywall('weekPlan')
    return
  }
  action.value = a
  if (a === 'recipe') {
    selectedDateKey.value = props.week.find((d) => !d.recipeTitle)?.dateKey ?? props.week[0]?.dateKey ?? toDateKey(new Date())
    description.value = ''
    suggestions.value = []
  } else {
    const empty = props.week.filter((d) => !d.recipeTitle).map((d) => d.dateKey)
    selectedDays.value = new Set(empty.length ? empty : props.week.map((d) => d.dateKey))
    servings.value = 2
    prefs.value = ''
  }
  mode.value = 'config'
}

function toggleDay(key: string) {
  const next = new Set(selectedDays.value)
  if (next.has(key)) next.delete(key)
  else next.add(key)
  selectedDays.value = next
}

function suggestionToInput(s: RecipeSuggestion, tags?: string[]): AssignRecipeInput {
  return {
    title: s.title,
    description: s.description,
    minutes: s.minutes ?? null,
    servings: s.servings ?? null,
    tags: tags ?? s.tags ?? [],
    ingredients: s.ingredients,
    steps: s.steps,
    nutrition: s.nutrition ?? null,
    source: 'ai',
  }
}

// ── Rezept: generieren → auswählen → einplanen ───────────────
async function generateRecipe() {
  if (!description.value.trim()) return
  const token = ++runToken
  mode.value = 'thinking'
  const data = await runTask(async () => {
    const res = await props.suggest(description.value.trim(), 3)
    if (res.kind === 'quota' || res.kind === 'premium') {
      showPaywall('aiRecipes')
      return null
    }
    return res.data
  })
  if (token !== runToken) return // abgebrochen / abgelöst
  if (data === null) { emit('close'); return }
  suggestions.value = data
  mode.value = 'suggestions'
}

async function pickSuggestion(s: RecipeSuggestion) {
  if (!selectedDateKey.value) return
  const ok = await props.assign(selectedDateKey.value, suggestionToInput(s))
  await playBloom()
  emit('assigned', ok)
}

// ── Woche: generieren → Vorschau → übernehmen ────────────────
async function generateWeek() {
  const keys = orderedSelectedKeys.value
  if (!keys.length) return
  const token = ++runToken
  mode.value = 'thinking'
  const days = await runTask(async () => {
    const res = await props.plan({ count: keys.length, servings: servings.value, prefs: prefs.value.trim() })
    if (res.kind === 'quota' || res.kind === 'premium') {
      showPaywall('weekPlan')
      return null
    }
    return keys
      .map((dateKey, i) => (res.data[i] ? { dateKey, suggestion: res.data[i] } : null))
      .filter((d): d is WeekPlanDay => d !== null)
  })
  if (token !== runToken) return // abgebrochen / abgelöst
  if (days === null) { emit('close'); return }
  previewDays.value = days
  mode.value = 'preview'
}

function removeDay(dateKey: string) {
  previewDays.value = previewDays.value.filter((d) => d.dateKey !== dateKey)
}

async function applyWeek() {
  if (!previewDays.value.length || applying.value) return
  applying.value = true
  const applied = [...previewDays.value]
  const count = await props.apply(applied)
  await playBloom()
  applying.value = false
  emit('applied', { count, days: applied, createList: createList.value })
}
</script>

<template>
  <BottomSheet
    :isOpen="isOpen"
    :title="sheetTitle"
    :thinking="mode === 'thinking'"
    @close="emit('close')"
  >
    <div class="kai area-food">
      <!-- Denk-Zustand: Sheet glüht, nur die Denk-Zeile + Abbrechen -->
      <template v-if="mode === 'thinking'">
        <AiThinkingRow
          :icon="thinkingCopy.icon"
          :status="thinkingCopy.status"
          :subtitle="thinkingCopy.subtitle"
        />
        <button type="button" class="kai-cancel" @click="cancelThinking">Abbrechen</button>
      </template>

      <!-- Aktionen -->
      <div v-else-if="mode === 'actions'" class="kai-actions">
        <button type="button" class="ai-row" @click="selectAction('week')">
          <span class="ai-row-ic">🪄</span>
          <span class="ai-row-txt"><b>Ganze Woche planen</b><i>7 Abendessen als kompletter Vorschlag</i></span>
          <span class="ai-row-chev" aria-hidden="true">›</span>
        </button>
        <button type="button" class="ai-row" @click="selectAction('recipe')">
          <span class="ai-row-ic">✨</span>
          <span class="ai-row-txt"><b>Rezept vorschlagen</b><i>Eine Idee für einen Tag</i></span>
          <span class="ai-row-chev" aria-hidden="true">›</span>
        </button>
      </div>

      <!-- Config: Rezept -->
      <div v-else-if="mode === 'config' && action === 'recipe'" class="kai-config">
        <div class="field-label">Für welchen Tag?</div>
        <div class="day-picker">
          <button
            v-for="d in week"
            :key="d.dateKey"
            type="button"
            class="day-pill"
            :class="{ 'day-pill--active': selectedDateKey === d.dateKey }"
            @click="selectedDateKey = d.dateKey"
          >{{ weekdayLabel(d.date) }}</button>
        </div>
        <p v-if="selectedDay?.recipeTitle" class="replace-hint">Ersetzt „{{ selectedDay.recipeTitle }}"</p>

        <div class="field-label mt">Was stellst du dir vor?</div>
        <textarea
          v-model="description"
          class="app-field kai-textarea"
          rows="3"
          placeholder="z. B. etwas Schnelles mit Hähnchen und Reis, wenig Aufwand …"
        />
        <button class="btn-ai" :disabled="!description.trim()" @click="generateRecipe">✨ Vorschläge holen</button>
        <button class="kai-back" type="button" @click="mode = 'actions'">‹ Zurück</button>
      </div>

      <!-- Config: Woche -->
      <div v-else-if="mode === 'config' && action === 'week'" class="kai-config">
        <div class="field-label">Welche Tage kocht ihr zuhause?</div>
        <div class="day-picker">
          <button
            v-for="d in week"
            :key="d.dateKey"
            type="button"
            class="day-pill"
            :class="{ 'day-pill--active': selectedDays.has(d.dateKey) }"
            @click="toggleDay(d.dateKey)"
          >{{ weekdayLabel(d.date) }}</button>
        </div>

        <div class="field-label mt">Für wie viele Portionen?</div>
        <div class="stepper">
          <button type="button" class="step-btn" :disabled="servings <= 1" @click="servings--">–</button>
          <span class="step-val">{{ servings }}</span>
          <button type="button" class="step-btn" :disabled="servings >= 12" @click="servings++">+</button>
        </div>

        <div class="field-label mt">Vorlieben & No-Gos (optional)</div>
        <textarea
          v-model="prefs"
          class="app-field kai-textarea"
          rows="2"
          placeholder="z. B. viel Gemüse, kein Fisch, schnell an Werktagen …"
        />
        <button class="btn-ai" :disabled="!selectedDays.size" @click="generateWeek">
          🪄 {{ selectedDays.size }} {{ selectedDays.size === 1 ? 'Tag' : 'Tage' }} planen
        </button>
        <button class="kai-back" type="button" @click="mode = 'actions'">‹ Zurück</button>
      </div>

      <!-- Rezept: Vorschläge auswählen -->
      <div v-else-if="mode === 'suggestions'" class="kai-suggestions">
        <p class="suggest-intro">Für {{ selectedDay ? weekdayLabel(selectedDay.date) : 'den Tag' }} — tippe einen Vorschlag zum Einplanen.</p>
        <div v-if="!suggestions.length" class="empty-hint">Keine Vorschläge — geh zurück und beschreib es anders.</div>
        <div v-else class="suggestion-list">
          <button v-for="(s, i) in suggestions" :key="i" type="button" class="suggestion-card" @click="pickSuggestion(s)">
            <div class="suggestion-title">{{ s.title }}</div>
            <div v-if="s.minutes || s.tags?.length" class="suggestion-meta">
              <span v-if="s.minutes">{{ s.minutes }} Min</span>
              <span v-if="s.tags?.length">{{ s.tags.join(', ') }}</span>
            </div>
            <div v-if="s.description" class="suggestion-desc">{{ s.description }}</div>
          </button>
        </div>
        <button class="kai-back" type="button" @click="mode = 'config'">‹ Ändern</button>
      </div>

      <!-- Woche: Vorschau -->
      <div v-else class="kai-preview">
        <div class="preview-head">
          <span class="section-label">✨ KI-Vorschlag</span>
          <span class="preview-hint">tippe ✕ zum Entfernen</span>
        </div>
        <div v-if="!previewDays.length" class="empty-hint">Kein Tag mehr übrig. Geh zurück und plane neu.</div>
        <div v-else class="preview-list">
          <div v-for="d in previewDays" :key="d.dateKey" class="preview-card">
            <div class="preview-main">
              <span class="preview-day">{{ weekdayLabel(dayByKey.get(d.dateKey)!.date) }}, {{ dayMonthLabel(dayByKey.get(d.dateKey)!.date) }}</span>
              <span class="preview-title">{{ d.suggestion.title }}</span>
              <span v-if="d.suggestion.minutes || d.suggestion.tags?.length" class="preview-meta">
                <template v-if="d.suggestion.minutes">{{ d.suggestion.minutes }} Min</template>
                <template v-if="d.suggestion.tags?.length"> · {{ d.suggestion.tags.join(', ') }}</template>
              </span>
              <span v-if="dayByKey.get(d.dateKey)!.recipeTitle" class="preview-replace">Ersetzt „{{ dayByKey.get(d.dateKey)!.recipeTitle }}"</span>
            </div>
            <button type="button" class="preview-remove" aria-label="Tag entfernen" @click="removeDay(d.dateKey)">✕</button>
          </div>
        </div>
        <label v-if="previewDays.length" class="preview-toggle">
          <input type="checkbox" v-model="createList" />
          <span>🛒 Einkaufsliste gleich mit erstellen</span>
        </label>
        <button class="btn-primary preview-apply" :disabled="!previewDays.length || applying" @click="applyWeek">
          {{ applying ? 'Wird eingeplant …' : `Woche übernehmen (${previewDays.length})` }}
        </button>
        <button class="kai-back" type="button" @click="mode = 'config'">‹ Ändern & neu planen</button>
      </div>
    </div>
  </BottomSheet>
</template>

<style scoped>
.kai-actions { display: flex; flex-direction: column; gap: 9px; }

.ai-row {
  display: flex; align-items: center; gap: 13px; width: 100%; padding: 12px;
  border: none; border-radius: 17px; background: var(--surface-deep); cursor: pointer;
  text-align: left; transition: transform 0.12s ease;
}
.ai-row:active { transform: scale(0.98); }
.ai-row-ic {
  flex: none; display: grid; place-items: center; width: 46px; height: 46px; border-radius: 14px;
  font-size: 22px; background: var(--ai-gradient); background-size: 200% 200%;
  box-shadow: var(--ai-glow); animation: aiShift 6s ease-in-out infinite;
}
.ai-row-txt { flex: 1; min-width: 0; }
.ai-row-txt b { display: block; font-family: var(--font-headline); font-weight: 600; font-size: 15.5px; color: var(--text); }
.ai-row-txt i { display: block; font-style: normal; font-size: 12.5px; font-weight: 700; color: var(--text-secondary); margin-top: 1px; }
.ai-row-chev { font-size: 24px; line-height: 1; color: var(--text-faint); }

/* ── Config ── */
.field-label { font-size: 11px; font-weight: 700; letter-spacing: 0.6px; text-transform: uppercase; color: var(--text-meta); margin-bottom: 7px; }
.field-label.mt { margin-top: 16px; }
.day-picker { display: flex; flex-wrap: wrap; gap: 6px; }
.day-pill {
  flex: 1; min-width: 38px; border: 1.5px solid var(--border-softer); background: var(--surface-deep);
  font-family: var(--font-body); font-size: 12.5px; font-weight: 700; padding: 8px 0; border-radius: 10px;
  color: var(--text-meta); cursor: pointer;
}
.day-pill--active { border-color: var(--accent); background: var(--accent-tint); color: var(--text); }
.replace-hint { font-size: 11.5px; color: var(--danger); margin: 6px 0 0; }
.kai-textarea { resize: none; margin-bottom: 4px; }
.stepper { display: flex; align-items: center; gap: 16px; }
.step-btn {
  width: 38px; height: 38px; border-radius: 10px; border: 1.5px solid var(--border-softer);
  background: var(--surface-deep); font-size: 20px; font-weight: 700; color: var(--text-secondary); cursor: pointer;
}
.step-btn:disabled { opacity: 0.4; pointer-events: none; }
.step-val { font-family: var(--font-headline); font-size: 18px; font-weight: 700; color: var(--text); min-width: 22px; text-align: center; }

/* KI-Aktionsbutton (Gradient) im Config-Schritt */
.btn-ai {
  display: flex; align-items: center; justify-content: center; width: 100%; padding: 13px 20px; margin-top: 18px;
  background: var(--ai-scrim), var(--ai-gradient); background-size: 100% 100%, var(--ai-gradient-size);
  color: #fff; border: none; border-radius: 16px; font-family: var(--font-body); font-size: 14.5px; font-weight: 700;
  cursor: pointer; box-shadow: var(--ai-glow); text-shadow: var(--ai-textshadow);
  animation: aiShift 6s ease-in-out infinite; transition: transform 0.12s ease;
}
.btn-ai:active { transform: scale(0.98); }
.btn-ai:disabled { opacity: 0.55; pointer-events: none; animation: none; }

.kai-back {
  display: block; margin: 10px auto 0; background: none; border: none; color: var(--text-meta);
  font-family: var(--font-body); font-size: 12.5px; font-weight: 600; text-decoration: underline; cursor: pointer;
}

/* Abbrechen im Denk-Zustand — weiß-transluzent auf dem Glow-Gradient. */
.kai-cancel {
  display: block; width: 100%; margin-top: 14px; padding: 12px;
  background: rgba(255, 255, 255, 0.2); border: 1px solid rgba(255, 255, 255, 0.3); border-radius: 14px;
  font-family: var(--font-body); font-size: 14px; font-weight: 700; color: #fff; cursor: pointer;
  text-shadow: var(--ai-textshadow);
}
.kai-cancel:active { transform: scale(0.98); }

/* ── Rezept-Vorschläge ── */
.suggest-intro { font-size: 12.5px; color: var(--text-secondary); margin: 0 0 12px; }
.suggestion-list { display: flex; flex-direction: column; gap: 8px; }
.suggestion-card { text-align: left; border: 1.5px solid var(--border-softer); background: var(--surface); border-radius: 12px; padding: 11px 13px; cursor: pointer; }
.suggestion-card:active { border-color: var(--accent); background: var(--accent-tint); }
.suggestion-title { font-size: 14px; font-weight: 700; color: var(--text); }
.suggestion-meta { display: flex; gap: 8px; font-size: 11.5px; color: var(--text-meta); margin-top: 2px; }
.suggestion-desc { font-size: 12px; color: var(--text-secondary); margin-top: 5px; line-height: 1.4; }

/* ── Vorschau ── */
.preview-head { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 12px; }
.section-label { font-size: 11px; font-weight: 800; letter-spacing: 0.7px; text-transform: uppercase; color: var(--accent); }
.preview-hint { font-size: 12px; font-weight: 700; color: var(--text-meta); }
.preview-list { display: flex; flex-direction: column; gap: 8px; }
.preview-card { display: flex; align-items: flex-start; gap: 10px; border: 1.5px solid var(--border-softer); background: var(--surface); border-radius: 12px; padding: 11px 13px; }
.preview-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.preview-day { font-size: 10.5px; font-weight: 700; letter-spacing: 0.4px; text-transform: uppercase; color: var(--accent); }
.preview-title { font-size: 14px; font-weight: 700; color: var(--text); }
.preview-meta { font-size: 11.5px; color: var(--text-meta); }
.preview-replace { font-size: 11px; color: var(--danger); margin-top: 2px; }
.preview-remove { flex-shrink: 0; width: 26px; height: 26px; border-radius: 50%; border: none; background: var(--surface-deep); color: var(--text-meta); font-size: 12px; cursor: pointer; }
.preview-toggle { display: flex; align-items: center; gap: 9px; margin-top: 16px; padding: 11px 13px; border: 1.5px solid var(--border-softer); border-radius: 12px; background: var(--surface); font-size: 13px; font-weight: 600; color: var(--text-secondary); cursor: pointer; }
.preview-toggle input { width: 18px; height: 18px; accent-color: var(--accent); flex-shrink: 0; }
.preview-apply { margin-top: 12px; }

.empty-hint { font-size: 12.5px; color: var(--text-faint); text-align: center; padding: 12px 0; line-height: 1.5; }
</style>

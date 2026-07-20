<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import AiThinkingRow from '@/components/ai/AiThinkingRow.vue'
import type { RecipeSuggestion, AiResult, Quota } from '@/services/ai'
import type { AssignRecipeInput } from '@/composables/useMealPlan'
import type { RecipeCategoryDef } from '@/types'
import { weekdayLabel } from '@/utils/mealplan'
import { showPaywall } from '@/composables/usePaywall'
import { useAiThinking } from '@/composables/useAiThinking'

const { runTask } = useAiThinking()

// Denk-Zustand: das Sheet selbst glüht (thinking), während die KI Vorschläge
// generiert. Kein Vollbild, keine schwebenden Indikatoren.
const thinking = ref(false)

interface WeekDayLite {
  date: Date
  dateKey: string
  recipeTitle: string | null
}

// Zwei Modi, ein Sheet — die aufwendige KI-Optik (Gradient-Button, Lade-Orb)
// und der Vorschlags-Zustand sind in beiden identisch, nur das Ziel unterscheidet
// sich: 'day' plant den Vorschlag direkt für einen Wochentag ein (Essensplan),
// 'library' speichert ihn mit selbst gewählten Kategorien ins Rezept-Wiki.
const props = defineProps<{
  isOpen: boolean
  suggest: (query: string, count?: number) => Promise<AiResult<RecipeSuggestion[]>>
  mode?: 'day' | 'library'
  // Nur im Tagesmodus:
  week?: WeekDayLite[]
  initialDateKey?: string | null
  assign?: (dateKey: string, input: AssignRecipeInput) => Promise<boolean>
  // Nur im Bibliotheksmodus:
  categories?: readonly RecipeCategoryDef[]
  save?: (input: AssignRecipeInput) => Promise<boolean>
}>()

const emit = defineEmits<{ close: []; assigned: [success: boolean] }>()

const isLibrary = computed(() => props.mode === 'library')
const week = computed(() => props.week ?? [])
const categories = computed(() => props.categories ?? [])

const selectedDateKey = ref('')
const description = ref('')
const searched = ref(false)
const suggestions = ref<RecipeSuggestion[]>([])
const quota = ref<Quota | null>(null)

// Bibliotheksmodus: der angetippte Vorschlag wartet hier, bis die Kategorien
// bestätigt sind — erst dann entsteht das Rezept-Dokument.
const pending = ref<RecipeSuggestion | null>(null)
const pendingTags = ref<Set<string>>(new Set())
const saving = ref(false)

watch(() => props.isOpen, (open) => {
  if (!open) return
  selectedDateKey.value = props.initialDateKey ?? week.value[0]?.dateKey ?? ''
  description.value = ''
  thinking.value = false
  searched.value = false
  suggestions.value = []
  quota.value = null
  pending.value = null
  pendingTags.value = new Set()
  saving.value = false
})

const selectedDay = computed(() => week.value.find((d) => d.dateKey === selectedDateKey.value) ?? null)

function togglePendingTag(id: string) {
  const next = new Set(pendingTags.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  pendingTags.value = next
}

// Nur anzeigen, wenn das Limit endlich klein ist — Premium (60/Monat) soll sich
// nicht wie ein Kontingent anfühlen, das man im Blick behalten muss.
const quotaLabel = computed(() => {
  const q = quota.value
  if (!q || q.limit === 0 || q.limit > 10) return null
  return `Noch ${Math.max(0, q.limit - q.used)} von ${q.limit} KI-Vorschlägen diesen Monat`
})

// Das Sheet wird zum Denk-Zustand (glüht), während die KI Vorschläge liefert.
let runToken = 0
function cancelThinking() {
  runToken++
  thinking.value = false
}

async function handleSubmit() {
  if (!description.value.trim() || thinking.value) return
  const token = ++runToken
  searched.value = true
  suggestions.value = []
  thinking.value = true
  const data = await runTask(runSuggest)
  if (token !== runToken) return // abgebrochen
  thinking.value = false
  if (data) suggestions.value = data
}

async function runSuggest(): Promise<RecipeSuggestion[] | null> {
  const result = await props.suggest(description.value.trim())
  if (result.kind === 'quota' || result.kind === 'premium') {
    emit('close')
    showPaywall('aiRecipes')
    return null
  }
  quota.value = result.quota
  return result.data
}

function recipeInput(s: RecipeSuggestion, tags: string[]): AssignRecipeInput {
  return {
    title: s.title,
    description: s.description,
    minutes: s.minutes ?? null,
    servings: s.servings ?? null,
    tags,
    ingredients: s.ingredients,
    steps: s.steps,
    nutrition: s.nutrition ?? null,
    source: 'ai',
  }
}

async function handlePick(s: RecipeSuggestion) {
  if (isLibrary.value) {
    // Gemini kennt nur die Default-Kategorie-IDs (TAG_IDS im Schema) — selbst
    // angelegte kann es nicht vorschlagen. Was es liefert, ist deshalb nur ein
    // Vorschlag: übernommen wird es als Vorauswahl, sofern die Kategorie noch
    // existiert, und danach entscheidet der Nutzer.
    pending.value = s
    pendingTags.value = new Set((s.tags ?? []).filter((t) => categories.value.some((c) => c.id === t)))
    return
  }

  if (!selectedDateKey.value || !props.assign) return
  const ok = await props.assign(selectedDateKey.value, recipeInput(s, s.tags ?? []))
  emit('assigned', ok)
}

async function handleSave() {
  const s = pending.value
  if (!s || !props.save || saving.value) return
  saving.value = true
  const ok = await props.save(recipeInput(s, [...pendingTags.value]))
  saving.value = false
  emit('assigned', ok)
}
</script>

<template>
  <BottomSheet :isOpen="isOpen" title="✨ KI-Rezeptvorschlag" :thinking="thinking" @close="emit('close')">
    <!-- Denk-Zustand: das Sheet glüht, nur die Denk-Zeile + Abbrechen -->
    <template v-if="thinking">
      <AiThinkingRow
        icon="✨"
        status="Sucht ein Rezept …"
        subtitle="Passend zu deinen Wünschen"
      />
      <button type="button" class="air-cancel" @click="cancelThinking">Abbrechen</button>
    </template>

    <!-- Bibliotheksmodus, Schritt 2: Kategorien für den gewählten Vorschlag -->
    <template v-else-if="pending">
      <div class="pending-title">{{ pending.title }}</div>
      <p v-if="pending.minutes" class="pending-meta">⏱ {{ pending.minutes }} Min</p>

      <div class="field-label cat-label">Kategorien</div>
      <p v-if="!categories.length" class="empty-hint">
        Noch keine Rezept-Kategorien — anlegen könnt ihr sie in den Einstellungen.
      </p>
      <div v-else class="cat-picker">
        <button
          v-for="c in categories"
          :key="c.id"
          type="button"
          class="cat-badge"
          :class="{ 'cat-badge--active': pendingTags.has(c.id) }"
          :style="pendingTags.has(c.id) ? { background: c.color, borderColor: c.color } : undefined"
          @click="togglePendingTag(c.id)"
        >
          {{ c.emoji }} {{ c.label }}
        </button>
      </div>

      <button class="btn-primary save-btn" :disabled="saving" @click="handleSave">
        {{ saving ? 'Wird gespeichert …' : 'Rezept speichern' }}
      </button>
      <button class="picker-toggle" type="button" @click="pending = null">
        ‹ Zurück zu den Vorschlägen
      </button>
    </template>

    <template v-else>
    <template v-if="!isLibrary">
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
    </template>

    <div class="field-label" :class="{ 'query-label': !isLibrary }">Was stellst du dir vor?</div>
    <textarea
      v-model="description"
      class="app-field ai-textarea"
      rows="3"
      placeholder="z. B. etwas Schnelles mit Hähnchen und Reis, wenig Aufwand …"
    />

    <button class="ai-submit-btn" :disabled="!description.trim()" @click="handleSubmit">
      ✨ Rezepte vorschlagen
    </button>

    <div v-if="searched && suggestions.length === 0" class="empty-hint">
      Keine Vorschläge gefunden — versuch's mit einer anderen Beschreibung.
    </div>

    <div v-if="suggestions.length > 0" class="suggestions">
      <button
        v-for="(s, i) in suggestions"
        :key="i"
        type="button"
        class="suggestion-card"
        :disabled="!isLibrary && !selectedDateKey"
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

    <p v-if="quotaLabel" class="quota-hint">{{ quotaLabel }}</p>
    </template>
  </BottomSheet>
</template>

<style scoped>
.air-cancel {
  display: block;
  width: 100%;
  margin-top: 14px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 14px;
  font-family: var(--font-body);
  font-size: 14px;
  font-weight: 700;
  color: #fff;
  text-shadow: var(--ai-textshadow);
  cursor: pointer;
}

.air-cancel:active {
  transform: scale(0.98);
}

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

/* Bibliotheksmodus, Schritt 2 */
.pending-title {
  font-family: var(--font-headline);
  font-size: 17px;
  font-weight: 700;
  color: var(--text);
}

.pending-meta {
  margin: 2px 0 0;
  font-size: 12px;
  color: var(--text-meta);
}

.cat-label {
  margin-top: 16px;
}

.cat-picker {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.cat-badge {
  padding: 7px 12px;
  border-radius: 20px;
  font-family: var(--font-body);
  font-size: 11.5px;
  font-weight: 700;
  cursor: pointer;
  background: var(--surface);
  color: var(--text-secondary);
  border: 1px solid var(--border-softer);
  white-space: nowrap;
}

.cat-badge--active {
  color: #fff;
}

.save-btn {
  margin-top: 16px;
}

.picker-toggle {
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

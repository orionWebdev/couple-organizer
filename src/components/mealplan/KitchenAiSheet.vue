<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import AiThinkingRow from '@/components/ai/AiThinkingRow.vue'
import SuggestionCard from './SuggestionCard.vue'
import FoodProfileForm from './FoodProfileForm.vue'
import type { FoodProfile } from '@/types'
import type { RecipeSuggestion, AiResult } from '@/services/ai'
import type { WeekPlanDay, AssignRecipeInput } from '@/composables/useMealPlan'
import { weekdayLabel, dayMonthLabel, dateKey as toDateKey } from '@/utils/mealplan'
import { showPaywall } from '@/composables/usePaywall'
import { showToast } from '@/composables/useToast'
import { useAiThinking } from '@/composables/useAiThinking'
import { useCouple } from '@/composables/useCouple'
import { resolveFoodProfile, foodProfileSummary, hasFoodProfileContent } from '@/utils/foodProfile'

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
  /** Wie viele Tage die eigene Sammlung gerade hergibt (0 = Knopf gesperrt). */
  libraryCapacity: number
  fillFromLibrary: (dateKeys: string[]) => Promise<number>
  suggest: (
    query: string,
    count?: number,
    opts?: { servings?: number | null; prefs?: string; avoidExtra?: string[] }
  ) => Promise<AiResult<RecipeSuggestion[]>>
  assign: (dateKey: string, input: AssignRecipeInput) => Promise<boolean>
  /** Beim Öffnen direkt in diese Aktion springen (KI-Hub-Weiche) statt in die
   *  Aktionsauswahl. null/undefined = normale Auswahl. */
  initialAction?: 'week' | 'recipe' | 'library' | null
}>()

const emit = defineEmits<{
  close: []
  applied: [payload: { count: number; days: WeekPlanDay[]; createList: boolean }]
  assigned: [ok: boolean]
  filled: [count: number]
}>()

const { runTask, playBloom } = useAiThinking()
const { couple, updateFoodProfile } = useCouple()

// Dauerhaftes Ess-Profil: liefert die Standard-Portionen und wird im
// 'profile'-Schritt bearbeitet. Der Aufruf selbst reichert die KI-Anfrage in
// useMealPlan.buildRecipeContext() damit an — hier wird es nur angezeigt.
const foodProfile = computed(() => resolveFoodProfile(couple.value))
const profileSummary = computed(() =>
  hasFoodProfileContent(foodProfile.value) ? foodProfileSummary(foodProfile.value) : null
)
const savingProfile = ref(false)

type Mode = 'actions' | 'config' | 'thinking' | 'suggestions' | 'preview' | 'profile'
const mode = ref<Mode>('actions')
// 'library' ist die einzige Aktion ohne KI-Aufruf.
const action = ref<'week' | 'recipe' | 'library'>('week')
const filling = ref(false)

// Rezept-Config
const selectedDateKey = ref('')
const description = ref('')
const suggestions = ref<RecipeSuggestion[]>([])
// Welcher Vorschlag ist aufgeklappt? Tap klappt auf, erst der Button plant ein.
const expandedIndex = ref<number | null>(null)

// Wochen-Config
const selectedDays = ref<Set<string>>(new Set())
const servings = ref(2)
const prefs = ref('')
const previewDays = ref<WeekPlanDay[]>([])
const createList = ref(true)
const applying = ref(false)
// Vorschau: aufgeklappter Tag und der Tag, der gerade neu gedacht wird.
const expandedPreview = ref<string | null>(null)
const rerollingKey = ref<string | null>(null)

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
  expandedIndex.value = null
  previewDays.value = []
  createList.value = true
  applying.value = false
  savingProfile.value = false
  // KI-Hub-Weiche: direkt in die gewünschte Aktion springen.
  if (props.initialAction) selectAction(props.initialAction)
})

const thinkingCopy = computed(() =>
  action.value === 'week'
    ? { icon: '🪄', status: 'Plant eure Woche …', subtitle: '7 Abendessen werden zusammengestellt' }
    : { icon: '✨', status: 'Sucht ein Rezept …', subtitle: 'Passend zu deinen Wünschen' },
)

const CONFIG_TITLES: Record<'week' | 'recipe' | 'library', string> = {
  week: '🪄 Ganze Woche planen',
  recipe: '✨ Rezept vorschlagen',
  library: '📖 Aus euren Rezepten',
}

const sheetTitle = computed(() => {
  if (mode.value === 'thinking') return undefined
  if (mode.value === 'actions') return 'Wochenplan füllen'
  if (mode.value === 'config') return CONFIG_TITLES[action.value]
  if (mode.value === 'suggestions') return '✨ Vorschläge'
  if (mode.value === 'profile') return '🍽 Euer Ess-Profil'
  return undefined // preview hat eigenen Kopf
})

async function saveProfile(next: FoodProfile) {
  savingProfile.value = true
  const ok = await updateFoodProfile(next)
  savingProfile.value = false
  showToast(ok ? 'Ess-Profil gespeichert' : 'Fehler beim Speichern')
  if (!ok) return
  // Neue Standard-Portionen sofort in die offene Konfiguration übernehmen.
  servings.value = next.servings
  mode.value = 'config'
}

// ── Aktion wählen → Config ───────────────────────────────────
function selectAction(a: 'week' | 'recipe' | 'library') {
  if (a === 'week' && !props.canPlanWeek) {
    showPaywall('weekPlan')
    return
  }
  action.value = a
  // Portionen starten immer auf dem Profilwert — in beiden Pfaden. Der Stepper
  // überschreibt ihn nur für diesen einen Lauf.
  servings.value = foodProfile.value.servings
  if (a === 'recipe') {
    selectedDateKey.value = props.week.find((d) => !d.recipeTitle)?.dateKey ?? props.week[0]?.dateKey ?? toDateKey(new Date())
    description.value = ''
    suggestions.value = []
    expandedIndex.value = null
  } else {
    // Woche wie Sammlung: standardmäßig die noch leeren Tage vorwählen.
    const empty = props.week.filter((d) => !d.recipeTitle).map((d) => d.dateKey)
    selectedDays.value = new Set(empty.length ? empty : props.week.map((d) => d.dateKey))
    prefs.value = ''
  }
  mode.value = 'config'
}

// Aus der eigenen Sammlung füllen — kein KI-Aufruf, kein Denk-Zustand, kein
// Vorschau-Schritt: das Ergebnis steht sofort im Plan und ist dort korrigierbar.
async function fillFromLibrary() {
  const keys = orderedSelectedKeys.value
  if (!keys.length || filling.value) return
  filling.value = true
  const count = await props.fillFromLibrary(keys)
  filling.value = false
  emit('filled', count)
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
  const res = await runTask(() => props.suggest(description.value.trim(), 3, { servings: servings.value }))
  if (token !== runToken) return // abgebrochen / abgelöst

  // Ein Fehlschlag führt zurück in die Konfiguration und sagt, was los war —
  // er darf nicht als "keine Vorschläge" durchgehen.
  if (!res || res.kind === 'error') {
    mode.value = 'config'
    showToast(res?.kind === 'error' ? res.message : 'Vorschläge konnten nicht geladen werden')
    return
  }
  if (res.kind !== 'ok') { showPaywall('aiRecipes'); emit('close'); return }

  suggestions.value = res.data
  expandedIndex.value = res.data.length === 1 ? 0 : null
  mode.value = 'suggestions'
}

function toggleSuggestion(i: number) {
  expandedIndex.value = expandedIndex.value === i ? null : i
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
  const res = await runTask(() =>
    props.plan({ count: keys.length, servings: servings.value, prefs: prefs.value.trim() })
  )
  if (token !== runToken) return // abgebrochen / abgelöst

  if (!res || res.kind === 'error') {
    mode.value = 'config'
    showToast(res?.kind === 'error' ? res.message : 'Der Wochenplan konnte nicht erstellt werden')
    return
  }
  if (res.kind !== 'ok') { showPaywall('weekPlan'); emit('close'); return }

  // Liefert die KI weniger Gerichte als Tage, bleiben die überzähligen Tage
  // einfach ungeplant — aber gar nichts zurückzubekommen ist ein Fehler und
  // keine leere Vorschau.
  if (!res.data.length) {
    mode.value = 'config'
    showToast('Die KI hat keinen Plan geliefert — probier es noch einmal')
    return
  }

  previewDays.value = keys
    .map((dateKey, i) => (res.data[i] ? { dateKey, suggestion: res.data[i] } : null))
    .filter((d): d is WeekPlanDay => d !== null)
  expandedPreview.value = null
  mode.value = 'preview'
}

function removeDay(dateKey: string) {
  previewDays.value = previewDays.value.filter((d) => d.dateKey !== dateKey)
  if (expandedPreview.value === dateKey) expandedPreview.value = null
}

function togglePreview(dateKey: string) {
  expandedPreview.value = expandedPreview.value === dateKey ? null : dateKey
}

// Einen einzelnen Tag neu denken lassen, statt die ganze Woche zu verwerfen.
// Geht bewusst über suggest() und nicht über plan(): ein Gericht ist ein
// Rezeptvorschlag (Kontingent recipeAi), kein neuer Wochenplan — sonst kostete
// jedes Austauschen eine der acht Autopilot-Einheiten im Monat.
async function rerollDay(day: WeekPlanDay) {
  if (rerollingKey.value) return
  rerollingKey.value = day.dateKey

  // Alles, was schon in der Vorschau steht, ist tabu — sonst kommt dasselbe
  // Gericht unter anderem Tag zurück.
  const avoidExtra = previewDays.value.map((d) => d.suggestion.title)
  const query = prefs.value.trim() || 'ein abwechslungsreiches Abendessen, das zur restlichen Woche passt'

  const res = await props.suggest(query, 1, { servings: servings.value, prefs: prefs.value.trim(), avoidExtra })
  rerollingKey.value = null

  if (res.kind === 'error') { showToast(res.message); return }
  if (res.kind !== 'ok') { showPaywall('aiRecipes'); return }

  const next = res.data[0]
  if (!next) { showToast('Kein neuer Vorschlag — probier es noch einmal'); return }

  previewDays.value = previewDays.value.map((d) =>
    d.dateKey === day.dateKey ? { dateKey: d.dateKey, suggestion: next } : d
  )
  expandedPreview.value = day.dateKey
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
        <!-- Kostenlos zuerst. Der fehlende Gradient ist die Botschaft: nur die
             beiden unteren Zeilen verbrauchen eine KI-Anfrage. -->
        <button
          type="button"
          class="ai-row lib-row"
          :disabled="libraryCapacity === 0"
          @click="selectAction('library')"
        >
          <span class="lib-row-ic">📖</span>
          <span class="ai-row-txt">
            <b>Aus euren Rezepten</b>
            <i v-if="libraryCapacity === 0">Noch keine passenden Rezepte gespeichert</i>
            <i v-else>{{ libraryCapacity }} Rezepte parat · ohne KI, sofort</i>
          </span>
          <span class="ai-row-chev" aria-hidden="true">›</span>
        </button>

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

        <div class="field-label mt">Für wie viele Portionen?</div>
        <div class="stepper">
          <button type="button" class="step-btn" :disabled="servings <= 1" @click="servings--">–</button>
          <span class="step-val">{{ servings }}</span>
          <button type="button" class="step-btn" :disabled="servings >= 12" @click="servings++">+</button>
        </div>

        <div class="field-label mt">Was stellst du dir vor?</div>
        <textarea
          v-model="description"
          class="app-field kai-textarea"
          rows="3"
          placeholder="z. B. etwas Schnelles mit Hähnchen und Reis, wenig Aufwand …"
        />

        <button type="button" class="profile-row" @click="mode = 'profile'">
          <span class="profile-row-txt">
            <b>🍽 Euer Ess-Profil</b>
            <i>{{ profileSummary ?? 'Noch nichts hinterlegt — Vorlieben & No-Gos einmal festlegen' }}</i>
          </span>
          <span class="profile-row-chev" aria-hidden="true">›</span>
        </button>

        <button class="btn-ai" :disabled="!description.trim()" @click="generateRecipe">✨ Vorschläge holen</button>
        <button class="kai-back" type="button" @click="mode = 'actions'">‹ Zurück</button>
      </div>

      <!-- Ess-Profil bearbeiten (dauerhaft, gilt für alle KI-Aufrufe) -->
      <div v-else-if="mode === 'profile'" class="kai-config">
        <FoodProfileForm
          :profile="foodProfile"
          :saving="savingProfile"
          saveLabel="Profil speichern"
          @save="saveProfile"
        />
        <button class="kai-back" type="button" @click="mode = 'config'">‹ Zurück</button>
      </div>

      <!-- Config: aus der eigenen Sammlung (ohne KI) -->
      <div v-else-if="mode === 'config' && action === 'library'" class="kai-config">
        <div class="field-label">Welche Tage sollen gefüllt werden?</div>
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

        <p class="lib-note">
          Genommen wird aus euren gespeicherten Rezepten: was es in den letzten zwei Wochen
          schon gab, wird übersprungen, Favoriten kommen zuerst.
        </p>
        <p v-if="selectedDays.size > libraryCapacity" class="lib-warn">
          Für {{ selectedDays.size }} Tage reichen die Rezepte nicht — es werden
          {{ libraryCapacity }} gefüllt.
        </p>

        <button
          class="btn-primary lib-cta"
          :disabled="!selectedDays.size || filling"
          @click="fillFromLibrary"
        >
          {{ filling ? 'Wird eingeplant …' : `📖 ${Math.min(selectedDays.size, libraryCapacity)} ${Math.min(selectedDays.size, libraryCapacity) === 1 ? 'Tag' : 'Tage'} füllen` }}
        </button>
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

        <div class="field-label mt">Nur für diese Woche (optional)</div>
        <textarea
          v-model="prefs"
          class="app-field kai-textarea"
          rows="2"
          placeholder="z. B. Besuch am Samstag, Reste vom Wochenende verbrauchen …"
        />

        <button type="button" class="profile-row" @click="mode = 'profile'">
          <span class="profile-row-txt">
            <b>🍽 Euer Ess-Profil</b>
            <i>{{ profileSummary ?? 'Noch nichts hinterlegt — Vorlieben & No-Gos einmal festlegen' }}</i>
          </span>
          <span class="profile-row-chev" aria-hidden="true">›</span>
        </button>

        <button class="btn-ai" :disabled="!selectedDays.size" @click="generateWeek">
          🪄 {{ selectedDays.size }} {{ selectedDays.size === 1 ? 'Tag' : 'Tage' }} planen
        </button>
        <button class="kai-back" type="button" @click="mode = 'actions'">‹ Zurück</button>
      </div>

      <!-- Rezept: Vorschläge ansehen und auswählen -->
      <div v-else-if="mode === 'suggestions'" class="kai-suggestions">
        <p class="suggest-intro">Für {{ selectedDay ? weekdayLabel(selectedDay.date) : 'den Tag' }} — tippe einen Vorschlag, um reinzuschauen.</p>
        <div v-if="!suggestions.length" class="empty-hint">Keine Vorschläge — geh zurück und beschreib es anders.</div>
        <div v-else class="suggestion-list">
          <SuggestionCard
            v-for="(s, i) in suggestions"
            :key="i"
            :suggestion="s"
            :expanded="expandedIndex === i"
            :actionLabel="`Für ${selectedDay ? weekdayLabel(selectedDay.date) : 'den Tag'} einplanen`"
            @toggle="toggleSuggestion(i)"
            @pick="pickSuggestion(s)"
          />
        </div>
        <button class="kai-back" type="button" @click="mode = 'config'">‹ Ändern</button>
      </div>

      <!-- Woche: Vorschau -->
      <div v-else class="kai-preview">
        <div class="preview-head">
          <span class="section-label">✨ KI-Vorschlag</span>
          <span class="preview-hint">tippen zum Ansehen</span>
        </div>
        <div v-if="!previewDays.length" class="empty-hint">Kein Tag mehr übrig. Geh zurück und plane neu.</div>
        <div v-else class="preview-list">
          <div v-for="d in previewDays" :key="d.dateKey" class="pday">
            <div class="pday-head">
              <span class="pday-day">{{ weekdayLabel(dayByKey.get(d.dateKey)!.date) }}, {{ dayMonthLabel(dayByKey.get(d.dateKey)!.date) }}</span>
              <button
                type="button"
                class="pday-btn"
                :disabled="!!rerollingKey"
                :aria-label="`${weekdayLabel(dayByKey.get(d.dateKey)!.date)} neu vorschlagen`"
                @click="rerollDay(d)"
              >{{ rerollingKey === d.dateKey ? '…' : '🔄' }}</button>
              <button
                type="button"
                class="pday-btn"
                :aria-label="`${weekdayLabel(dayByKey.get(d.dateKey)!.date)} entfernen`"
                @click="removeDay(d.dateKey)"
              >✕</button>
            </div>
            <p v-if="dayByKey.get(d.dateKey)!.recipeTitle" class="preview-replace">
              Ersetzt „{{ dayByKey.get(d.dateKey)!.recipeTitle }}"
            </p>
            <SuggestionCard
              :suggestion="d.suggestion"
              :expanded="expandedPreview === d.dateKey"
              @toggle="togglePreview(d.dateKey)"
            />
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

/* Die kostenlose Zeile trägt bewusst KEINEN Gradient und kein Glühen — der
   optische Unterschied ist die ehrlichste Auskunft darüber, was eine Anfrage
   kostet und was nicht. */
.lib-row:disabled { opacity: 0.5; pointer-events: none; }
.lib-row-ic {
  flex: none; display: grid; place-items: center; width: 46px; height: 46px; border-radius: 14px;
  font-size: 22px; background: var(--surface); border: 1.5px solid var(--border-softer);
}
.lib-note { font-size: 12px; color: var(--text-meta); line-height: 1.5; margin: 16px 0 0; }
.lib-warn { font-size: 12px; color: var(--danger); line-height: 1.5; margin: 8px 0 0; }
.lib-cta { margin-top: 18px; }

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

/* Zeile zum dauerhaften Ess-Profil — steht in beiden Config-Schritten direkt
   über dem KI-Button, weil man genau dort merkt, dass man sich wiederholt. */
.profile-row {
  display: flex; align-items: center; gap: 10px; width: 100%; margin-top: 14px; padding: 10px 12px;
  border: 1.5px dashed var(--border-softer); border-radius: 13px; background: none; cursor: pointer; text-align: left;
}
.profile-row:active { background: var(--surface-deep); }
.profile-row-txt { flex: 1; min-width: 0; }
.profile-row-txt b { display: block; font-size: 13px; font-weight: 700; color: var(--text); }
.profile-row-txt i {
  display: block; font-style: normal; font-size: 11.5px; font-weight: 600; color: var(--text-meta);
  margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.profile-row-chev { flex: none; font-size: 20px; line-height: 1; color: var(--text-faint); }

/* ── Rezept-Vorschläge ── */
.suggest-intro { font-size: 12.5px; color: var(--text-secondary); margin: 0 0 12px; }
.suggestion-list { display: flex; flex-direction: column; gap: 8px; }

/* ── Vorschau ── */
.preview-head { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 12px; }
.section-label { font-size: 11px; font-weight: 800; letter-spacing: 0.7px; text-transform: uppercase; color: var(--accent); }
.preview-hint { font-size: 12px; font-weight: 700; color: var(--text-meta); }
.preview-list { display: flex; flex-direction: column; gap: 14px; }

/* Ein Tag der Vorschau: Kopfzeile mit Datum + Aktionen, darunter die
   aufklappbare Rezeptkarte (dieselbe wie bei den Einzelvorschlägen). */
.pday { display: flex; flex-direction: column; gap: 5px; }
.pday-head { display: flex; align-items: center; gap: 6px; }
.pday-day {
  flex: 1; min-width: 0; font-size: 10.5px; font-weight: 700; letter-spacing: 0.4px;
  text-transform: uppercase; color: var(--accent);
}
.pday-btn {
  flex-shrink: 0; width: 28px; height: 28px; border-radius: 50%; border: none;
  background: var(--surface-deep); color: var(--text-meta); font-size: 12px; cursor: pointer;
}
.pday-btn:active { transform: scale(0.92); }
.pday-btn:disabled { opacity: 0.45; pointer-events: none; }
.preview-replace { font-size: 11px; color: var(--danger); margin: 0; }
.preview-toggle { display: flex; align-items: center; gap: 9px; margin-top: 16px; padding: 11px 13px; border: 1.5px solid var(--border-softer); border-radius: 12px; background: var(--surface); font-size: 13px; font-weight: 600; color: var(--text-secondary); cursor: pointer; }
.preview-toggle input { width: 18px; height: 18px; accent-color: var(--accent); flex-shrink: 0; }
.preview-apply { margin-top: 12px; }

.empty-hint { font-size: 12.5px; color: var(--text-faint); text-align: center; padding: 12px 0; line-height: 1.5; }
</style>

<script setup lang="ts">
// Der zentrale KI-Hub — ein Bottom-Sheet-Modal mit ALLEN KI-Funktionen.
// Einmal im TabsView gemountet (global), geöffnet über den dauerhaften
// AiHubButton. Ersetzt alle früheren verstreuten KI-Einstiege.
//
// Bewusst schlank gehalten (vier Kacheln statt sieben): der Hub ist ein
// Alltags-Knopf, keine Funktionswand. Zwei Aufräum-Entscheidungen:
//   • Die drei Coach-Linsen sind EINE Sache — hier steht nur der schnelle
//     Wochen-Rückblick (week). Fairness/Budget erzeugt man da, wo man sie
//     ansieht: pro Linse in der CoachCard im Wir-Tab.
//   • „Rezept" ist EINE Kachel; das Ziel (auf einen Tag / in die Sammlung)
//     wählt man im Schritt danach.
//
// Aufteilung der Flows:
//   • Wochen-Rückblick läuft DIREKT hier — `startCoach('week')`; das Modal
//     glüht im Denk-Zustand, der Bericht erscheint im Wir-Tab.
//   • Wochenplan/Rezept(Tag)/Einkaufsliste sind eine Weiche: sie öffnen den
//     bestehenden, polierten Küchen-Flow (KitchenAiSheet mit Vorschau/Re-Roll)
//     per Navigation nach /alltag?tab=kueche&ai=… — kein dupliziertes
//     Meal-Plan-Wiring.
//   • Rezept(Sammlung) generiert direkt hier ins Wiki (AiRecipeSheet library).
//   • Der private Stimmungs-Check öffnet das bestehende CheckinSheet
//     (Consent, Bereich, Stufe, Text) — kein Parallel-System.
//
// useCoachRun ist bewusst hier (immer gemountet) instanziiert: der Snapshot
// muss bei Tap SOFORT aus geladenen Daten gebaut werden, nicht erst nach dem
// Öffnen des Modals nachladen.
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { useCouple } from '@/composables/useCouple'
import { useCheckin } from '@/composables/useCheckin'
import { useCoachRun } from '@/composables/useCoachRun'
import { useMealPlan } from '@/composables/useMealPlan'
import { useAiHub } from '@/composables/useAiHub'
import { useBackDismiss } from '@/composables/useBackButton'
import { showToast } from '@/composables/useToast'
import { showPaywall } from '@/composables/usePaywall'
import { resolveRecipeCategories } from '@/utils/recipeTags'
import type { CoachLens } from '@/services/ai'
import type { AssignRecipeInput } from '@/composables/useMealPlan'
import CheckinSheet from '@/components/dashboard/CheckinSheet.vue'
import AiRecipeSheet from '@/components/mealplan/AiRecipeSheet.vue'

const router = useRouter()
const { user } = useAuth()
const { couple, setCheckinConsent } = useCouple()
const coupleId = computed(() => user.value?.coupleId ?? null)

const { isOpen, closeAiHub } = useAiHub()

const {
  coachThinking, startCoach,
} = useCoachRun(coupleId)

const {
  optedIn: checkinOptedIn,
  addEntry: addCheckinEntry,
} = useCheckin(coupleId)

// Für die Kachel „Rezept sammeln" (generiert ein Rezept in die Wiki-Sammlung).
const { suggestRecipes, createRecipe, canCreateRecipe } = useMealPlan(coupleId)
const recipeCategories = computed(() => resolveRecipeCategories(couple.value))

// ── Steps ────────────────────────────────────────────────────
type Step = 'hub' | 'thinking' | 'recipeTarget'
const step = ref<Step>('hub')
const thinkTitle = ref('')

// Denk-Zustand des Modals (Glow + Denk-Zeile). Der Scrim ist dabei gesperrt.
const thinking = computed(() => step.value === 'thinking' || coachThinking.value)

// Android-Zurück / Scrim: aus dem Rezept-Ziel-Schritt zurück zum Hub, sonst
// schließen. Im Denk-Zustand blockiert.
function tryClose() {
  if (thinking.value) return
  if (step.value === 'recipeTarget') { step.value = 'hub'; return }
  closeAiHub()
  step.value = 'hub'
}
useBackDismiss(() => isOpen.value, tryClose)

// ── Coach-Flows (direkt) ─────────────────────────────────────
const COACH_THINK: Record<CoachLens, string> = {
  week: 'Schreibt euren Rückblick …',
  fairness: 'Schaut auf die Lastverteilung …',
  money: 'Fasst eure Ausgaben zusammen …',
}
const COACH_DONE: Record<CoachLens, string> = {
  week: '✨ Euer Wochenrückblick ist fertig — im Wir-Tab.',
  fairness: '✨ Fairness-Einordnung fertig — im Wir-Tab.',
  money: '✨ Budget-Blick fertig — im Wir-Tab.',
}

async function runCoach(lens: CoachLens) {
  thinkTitle.value = COACH_THINK[lens]
  step.value = 'thinking'
  const outcome = await startCoach(lens)
  step.value = 'hub'
  closeAiHub()
  if (outcome === 'ok') showToast(COACH_DONE[lens])
  // paywall/error hat startCoach selbst gemeldet.
}

// ── Küchen-Weiche (Wochenplan/Rezept/Einkaufsliste) ──────────
function toKitchen(ai: 'week' | 'recipe' | 'list') {
  closeAiHub()
  step.value = 'hub'
  router.push(`/alltag?tab=kueche&ai=${ai}`)
}

// „Rezept" ist eine Kachel, das Ziel folgt im nächsten Schritt: auf einen
// Wochentag (Küchen-Flow) oder in die Wiki-Sammlung (AiRecipeSheet library).
function chooseRecipeTarget(target: 'day' | 'library') {
  if (target === 'day') toKitchen('recipe')
  else openCollect()
}

// ── „Rezept sammeln" — generiert direkt hier in die Wiki-Sammlung ──
// AiRecipeSheet (library-Modus) trägt die Vorschau + Kategorie-Auswahl selbst.
const showCollectSheet = ref(false)
function openCollect() {
  if (!canCreateRecipe.value) { showPaywall('recipeCount'); return }
  closeAiHub()
  step.value = 'hub'
  showCollectSheet.value = true
}
async function saveCollectedRecipe(input: AssignRecipeInput) {
  if (!canCreateRecipe.value) { showCollectSheet.value = false; showPaywall('recipeCount'); return false }
  return createRecipe(input)
}
function onRecipeCollected(success: boolean) {
  showCollectSheet.value = false
  showToast(success ? '✨ Rezept in eure Sammlung gespeichert.' : 'Fehler beim Speichern')
}

// ── Stimmungs-Check → bestehendes CheckinSheet ───────────────
const showCheckinSheet = ref(false)
function openMood() {
  closeAiHub()
  step.value = 'hub'
  showCheckinSheet.value = true
}
async function onCheckinConsent() {
  if (!await setCheckinConsent(true)) showToast('Konnte nicht gespeichert werden')
}
async function onCheckinSubmit(payload: Parameters<typeof addCheckinEntry>[0]) {
  if (!await addCheckinEntry(payload)) { showToast('Konnte nicht gespeichert werden'); return }
  showCheckinSheet.value = false
  showToast('Gespeichert — nur für dich 🔒')
}

// ── Aktions-Registry (die Kacheln) — bewusst vier ────────────
// Fairness/Budget sind KEINE eigenen Kacheln mehr: die erzeugt man pro Linse
// in der CoachCard (Wir-Tab). „Rezept" führt in den Ziel-Schritt.
interface HubAction { id: string; label: string; sub: string; icon: string; tint: string; run: () => void }
const actions: HubAction[] = [
  { id: 'wochenplan', label: 'Wochenplan', sub: 'Ganze Woche vorschlagen', icon: '🍽️', tint: 'var(--food-tint)', run: () => toKitchen('week') },
  { id: 'rezept', label: 'Rezept', sub: 'Für einen Tag oder die Sammlung', icon: '📖', tint: 'var(--food-tint)', run: () => { step.value = 'recipeTarget' } },
  { id: 'einkauf', label: 'Einkaufsliste', sub: 'Aus dem Plan erzeugen', icon: '🛒', tint: 'var(--einkauf-tint)', run: () => toKitchen('list') },
  { id: 'rueckblick', label: 'Wochen-Check-in', sub: 'Wie lief eure Woche', icon: '💛', tint: 'var(--planung-tint)', run: () => runCoach('week') },
]
</script>

<template>
  <div>
    <!-- Scrim -->
    <Transition name="scrim-fade">
      <div v-if="isOpen" class="ki-scrim" @click="tryClose" />
    </Transition>

    <!-- Modal -->
    <div class="kimodal" :class="{ show: isOpen, thinking }">
      <div class="kimodal__glow" aria-hidden="true" />
      <div class="grab" aria-hidden="true" />

      <!-- Denk-Zustand -->
      <div v-if="thinking" class="thinkview">
        <div class="thinkrow">
          <div class="tile" aria-hidden="true">✨</div>
          <div class="st"><b>{{ thinkTitle || 'Einen Moment …' }}</b><span>Einen Moment</span></div>
          <div class="miniload" aria-hidden="true" />
        </div>
        <div class="progress"><i /></div>
      </div>

      <!-- Rezept-Ziel-Schritt: Tag oder Sammlung -->
      <div v-else-if="step === 'recipeTarget'" class="targetview">
        <button type="button" class="tv-back" @click="step = 'hub'">‹ Zurück</button>
        <h2 class="tv-title">Rezept — wohin?</h2>
        <button type="button" class="tv-opt" @click="chooseRecipeTarget('day')">
          <span class="tv-e" :style="{ background: 'var(--food-tint)' }">📅</span>
          <span class="tv-txt"><b>Auf einen Tag</b><span>Direkt in den Wochenplan</span></span>
          <span class="tv-arr" aria-hidden="true">›</span>
        </button>
        <button type="button" class="tv-opt" @click="chooseRecipeTarget('library')">
          <span class="tv-e" :style="{ background: 'var(--food-tint)' }">✨</span>
          <span class="tv-txt"><b>In eure Sammlung</b><span>Ins Rezept-Wiki</span></span>
          <span class="tv-arr" aria-hidden="true">›</span>
        </button>
      </div>

      <!-- Hub: alle KI-Aktionen + privater Stimmungs-Check -->
      <template v-else>
        <div class="kihead">
          <div class="badge" aria-hidden="true">✨</div>
          <div>
            <h2>Womit soll ich helfen?</h2>
            <p>Für euch beide</p>
          </div>
        </div>

        <div class="kigrid">
          <button
            v-for="a in actions"
            :key="a.id"
            type="button"
            class="kiaction"
            @click="a.run"
          >
            <span class="e" :style="{ background: a.tint }">{{ a.icon }}</span>
            <b>{{ a.label }}</b>
            <span class="s">{{ a.sub }}</span>
          </button>
        </div>

        <div class="divider"><span class="l" /><span class="t">und dich selbst</span><span class="l" /></div>

        <button type="button" class="moodcard" @click="openMood">
          <p class="q">Wie geht's dir gerade?</p>
          <p class="sub">
            <span class="lock" aria-hidden="true">🔒</span>
            Nur für dich — fließt privat in euren Rückblick
          </p>
          <div class="moods" aria-hidden="true">
            <span class="mood">😔</span><span class="mood">🙁</span><span class="mood">😐</span><span class="mood">🙂</span><span class="mood">😄</span>
          </div>
        </button>
      </template>
    </div>

    <!-- Der private Check-in (global aus dem Hub geöffnet). -->
    <CheckinSheet
      :isOpen="showCheckinSheet"
      :optedIn="checkinOptedIn"
      areaClass="area-planung"
      @close="showCheckinSheet = false"
      @consent="onCheckinConsent"
      @submit="onCheckinSubmit"
    />

    <!-- „Rezept sammeln" — generiert ein Rezept in die Wiki-Sammlung. -->
    <AiRecipeSheet
      :isOpen="showCollectSheet"
      mode="library"
      :suggest="suggestRecipes"
      :categories="recipeCategories"
      :save="saveCollectedRecipe"
      @close="showCollectSheet = false"
      @assigned="onRecipeCollected"
    />
  </div>
</template>

<style scoped>
.ki-scrim {
  position: fixed;
  inset: 0;
  z-index: 190;
  background: rgba(28, 20, 12, 0.42);
}
.scrim-fade-enter-active,
.scrim-fade-leave-active { transition: opacity 0.28s var(--ease-standard); }
.scrim-fade-enter-from,
.scrim-fade-leave-to { opacity: 0; }

.kimodal {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 200;
  max-height: 88dvh;
  overflow-y: auto;
  background: var(--surface);
  border-radius: var(--radius-sheet) var(--radius-sheet) 0 0;
  padding: 14px var(--screen-pad) calc(28px + var(--safe-bottom));
  transform: translateY(102%);
  transition: transform var(--dur-sheet-open) var(--ease-overshoot);
}
.kimodal.show { transform: translateY(0); }
.kimodal::-webkit-scrollbar { display: none; }

/* Denk-Glow HINTER dem Modal — atmender Gradient. Theme-unabhängig. */
.kimodal__glow {
  display: none;
  position: absolute;
  left: -4px;
  right: -4px;
  top: -6px;
  bottom: 0;
  z-index: -1;
  border-radius: 34px 34px 0 0;
  background: var(--ai-gradient);
  background-size: 300% 300%;
  filter: blur(24px);
  opacity: 0.8;
  animation: aiShift 4s ease-in-out infinite, edgeBreath 2.8s ease-in-out infinite;
}
.kimodal.thinking { overflow: visible; }
.kimodal.thinking .kimodal__glow { display: block; }

.grab {
  width: 40px;
  height: 5px;
  border-radius: 3px;
  background: var(--border);
  margin: 0 auto 14px;
}

.kihead {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 18px;
}
.kihead .badge {
  width: 42px;
  height: 42px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  font-size: 21px;
  color: #fff;
  background: var(--ai-scrim), var(--ai-gradient);
  background-size: 100% 100%, var(--ai-gradient-size);
  box-shadow: var(--ai-glow);
}
.kihead h2 {
  margin: 0;
  font-family: var(--font-headline);
  font-size: 19px;
  font-weight: 600;
  color: var(--text);
}
.kihead p {
  margin: 2px 0 0;
  font-size: 12.5px;
  font-weight: 700;
  color: var(--text-secondary);
}

.kigrid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.kiaction {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  padding: 14px;
  border: 1px solid var(--border-softer);
  border-radius: var(--radius-card);
  background: var(--surface);
  box-shadow: var(--shadow-card);
  cursor: pointer;
  text-align: left;
}
.kiaction:active { transform: scale(0.98); }
.kiaction .e {
  width: 38px;
  height: 38px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  font-size: 19px;
  margin-bottom: 10px;
}
.kiaction b {
  font-family: var(--font-headline);
  font-size: 14.5px;
  font-weight: 600;
  color: var(--text);
}
.kiaction .s {
  font-size: 11.5px;
  font-weight: 700;
  color: var(--text-meta);
}

.divider {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 20px 2px 14px;
}
.divider .l {
  flex: 1;
  height: 1px;
  background: var(--border-softer);
}
.divider .t {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.4px;
  text-transform: uppercase;
  color: var(--text-meta);
}

.moodcard {
  display: block;
  width: 100%;
  border: none;
  background: var(--surface-deep);
  border-radius: 16px;
  padding: 15px 16px;
  cursor: pointer;
  text-align: left;
}
.moodcard .q {
  margin: 0 0 3px;
  font-family: var(--font-headline);
  font-weight: 600;
  font-size: 16px;
  color: var(--text);
}
.moodcard .sub {
  margin: 0 0 14px;
  font-size: 12px;
  font-weight: 700;
  color: var(--text-secondary);
  display: inline-flex;
  align-items: center;
  gap: 5px;
}
.moodcard .lock { color: var(--planung); }
.moods { display: flex; gap: 8px; }
.moods .mood {
  flex: 1;
  aspect-ratio: 1;
  border: 1.5px solid var(--border-soft);
  background: var(--surface);
  border-radius: 14px;
  font-size: 24px;
  display: grid;
  place-items: center;
}

/* ── Rezept-Ziel-Schritt ────────────────────────────────────── */
.targetview { padding: 2px 0 4px; }
.tv-back {
  border: none;
  background: none;
  padding: 4px 2px;
  margin-bottom: 8px;
  font-family: var(--font-body);
  font-size: 13px;
  font-weight: 800;
  color: var(--text-secondary);
  cursor: pointer;
}
.tv-title {
  margin: 0 0 14px;
  font-family: var(--font-headline);
  font-size: 19px;
  font-weight: 600;
  color: var(--text);
}
.tv-opt {
  display: flex;
  align-items: center;
  gap: 13px;
  width: 100%;
  padding: 14px;
  margin-bottom: 10px;
  border: 1px solid var(--border-softer);
  border-radius: var(--radius-card);
  background: var(--surface);
  box-shadow: var(--shadow-card);
  cursor: pointer;
  text-align: left;
}
.tv-opt:active { transform: scale(0.99); }
.tv-e {
  width: 44px;
  height: 44px;
  border-radius: 13px;
  display: grid;
  place-items: center;
  font-size: 21px;
  flex: none;
}
.tv-txt { flex: 1; }
.tv-txt b {
  display: block;
  font-family: var(--font-headline);
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
}
.tv-txt span {
  font-size: 12px;
  font-weight: 700;
  color: var(--text-meta);
}
.tv-arr {
  font-size: 22px;
  color: var(--text-faint);
  flex: none;
}

/* ── Denk-Zeile ─────────────────────────────────────────────── */
.thinkview { padding: 8px 0 4px; }
.thinkrow {
  display: flex;
  align-items: center;
  gap: 13px;
  background: var(--surface-deep);
  border-radius: 17px;
  padding: 15px 14px;
}
.thinkrow .tile {
  width: 46px;
  height: 46px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  font-size: 22px;
  flex: none;
  color: #fff;
  background: var(--ai-gradient);
  background-size: 200% 200%;
  box-shadow: var(--ai-glow);
  animation: aiShift 4s ease-in-out infinite;
}
.thinkrow .st { flex: 1; }
.thinkrow .st b {
  display: block;
  font-family: var(--font-headline);
  font-weight: 600;
  font-size: 15.5px;
  color: var(--text);
}
.thinkrow .st span {
  display: block;
  font-size: 12.5px;
  font-weight: 700;
  color: var(--text-secondary);
  margin-top: 2px;
}
.miniload {
  width: 22px;
  height: 22px;
  flex: none;
  border-radius: 50%;
  border: 3px solid color-mix(in srgb, var(--ai-mark) 22%, transparent);
  border-top-color: var(--ai-mark);
  animation: aiSpin 0.8s linear infinite;
}
.progress {
  height: 3px;
  border-radius: 3px;
  background: var(--surface-deep);
  margin: 16px 4px 4px;
  overflow: hidden;
}
.progress i {
  display: block;
  width: 33%;
  height: 100%;
  border-radius: 3px;
  background: var(--ai-gradient);
  background-size: 200% 200%;
  animation: barSlide 1.4s ease-in-out infinite, aiShift 4s ease-in-out infinite;
}
</style>

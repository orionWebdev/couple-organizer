<script setup lang="ts">
import { computed, ref } from 'vue'
import type { CoachAction, CoachLens, CoachMetric, CoachReport } from '@/services/ai'
import CoachReportCard from '@/components/ai/CoachReportCard.vue'

// Der Paar-Coach im Wir-Tab — die EINE Anzeige für alle drei Blickwinkel
// (Woche · Fairness · Geld). Liegt für die aktive Linse noch kein Bericht
// dieser Woche vor, erzeugt man ihn HIER inline (`generate(lens)`) — genau da,
// wo man ihn ansieht. Der Wochen-Check-in (week) ist zusätzlich als schnelle
// Abkürzung im globalen KI-Button; Fairness/Geld gibt es nur noch hier.
//
// Pro Woche und Linse genau ein Bericht, für beide.
const props = defineProps<{
  // Bericht + Kennzahlen + Ersteller je Linse (aus useCoachRun).
  reportFor: (lens: CoachLens) => CoachReport | null
  metricsFor: (lens: CoachLens) => CoachMetric[]
  createdByNameFor: (lens: CoachLens) => string | null
  /** Erzeugt den Bericht der Linse (useCoachRun.startCoach) — meldet Paywall/
   *  Fehler selbst, gibt den Ausgang zurück. */
  generate: (lens: CoachLens) => Promise<'ok' | 'paywall' | 'error' | 'cancelled'>
  /** Läuft gerade eine Erzeugung? (global, es kann nur eine zur Zeit laufen) */
  thinking?: boolean
  /** Solange die Berichte laden, ist "kein Bericht" noch keine Aussage. */
  loading?: boolean
}>()

defineEmits<{ action: [action: CoachAction] }>()

const lenses: { id: CoachLens; label: string }[] = [
  { id: 'week', label: 'Woche' },
  { id: 'fairness', label: 'Fairness' },
  { id: 'money', label: 'Geld' },
]

const activeLens = ref<CoachLens>('week')

const report = computed(() => props.reportFor(activeLens.value))
const metrics = computed(() => props.metricsFor(activeLens.value))
const createdByName = computed(() => props.createdByNameFor(activeLens.value))
const hasReport = computed(() => !!report.value)

const showEntry = computed(() => !report.value && !props.loading)

// Leerzustand je Linse: eine Zeile, was fehlt, + der Knopf, der es erzeugt.
const EMPTY_LEAD: Record<CoachLens, string> = {
  week: 'Noch kein Rückblick dieser Woche.',
  fairness: 'Noch keine Fairness-Einschätzung dieser Woche.',
  money: 'Noch kein Budget-Blick dieser Woche.',
}
const GEN_LABEL: Record<CoachLens, string> = {
  week: 'Rückblick schreiben',
  fairness: 'Lastverteilung einschätzen',
  money: 'Ausgaben einordnen',
}
const emptyLead = computed(() => EMPTY_LEAD[activeLens.value])
const genLabel = computed(() => GEN_LABEL[activeLens.value])

// Welche Linse gerade erzeugt wird — nur ihr Knopf zeigt den Spinner.
const genLens = ref<CoachLens | null>(null)
const busyHere = computed(() => props.thinking && genLens.value === activeLens.value)

async function runGen() {
  if (props.thinking) return
  genLens.value = activeLens.value
  await props.generate(activeLens.value)
  genLens.value = null
}

// Punkt an einer Linse: für sie liegt noch kein Bericht dieser Woche vor.
function pending(lens: CoachLens) {
  return !props.reportFor(lens) && !props.loading
}
</script>

<template>
  <div class="ck">
    <div class="sec">
      <span class="sec-lab">Euer Wochen-Check-in</span>
      <span v-if="hasReport && createdByName" class="sec-by">von {{ createdByName }}</span>
    </div>

    <!-- EIN Widget: die Linsen sitzen INNEN, nur der Inhalt darunter wechselt
         animiert — der übrige Wir-Tab bleibt unberührt. -->
    <div class="coach-widget">
      <div class="lenses">
        <button
          v-for="l in lenses"
          :key="l.id"
          type="button"
          class="lens"
          :class="{ 'lens--on': activeLens === l.id }"
          @click="activeLens = l.id"
        >
          {{ l.label }}
          <span v-if="pending(l.id)" class="lens-dot" aria-hidden="true" />
        </button>
      </div>

      <!-- Inhaltswechsel mit der Segment-Transition aus dem App-Pool
           (opacity + translateY, --ease-standard/--ease-in). Der :key auf der
           Linse erzwingt den Aus/Ein-Wechsel. -->
      <div class="cw-body">
        <Transition name="lens-swap" mode="out-in">
          <CoachReportCard
            v-if="report"
            :key="'report-' + activeLens"
            embedded
            :report="report"
            :metrics="metrics"
            @action="$emit('action', $event)"
          />

          <!-- Noch kein Bericht dieser Linse — hier direkt erzeugen. -->
          <div v-else-if="showEntry" :key="'entry-' + activeLens" class="entry-gen">
            <p class="entry-gen__lead">{{ emptyLead }}</p>
            <button
              type="button"
              class="entry-gen__btn"
              :class="{ 'is-busy': busyHere }"
              :disabled="thinking"
              @click="runGen"
            >
              <span v-if="busyHere" class="entry-gen__spin" aria-hidden="true" />
              <span v-else class="entry-gen__spark" aria-hidden="true">✨</span>
              {{ busyHere ? 'Einen Moment …' : genLabel }}
            </button>
          </div>
        </Transition>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ck {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.sec {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  padding: 2px 4px;
  margin-top: 6px;
}

.sec-lab {
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.6px;
  text-transform: uppercase;
  color: var(--text-meta);
}

.sec-by {
  font-size: 12px;
  font-weight: 700;
  color: var(--text-faint);
}

/* Das Widget: eine Karte, die die Linsen UND den wechselnden Inhalt umschließt
   — damit ist sichtbar, dass die Segmente nur dieses Widget steuern. */
.coach-widget {
  background: var(--surface);
  border: 1px solid var(--border-softer);
  border-radius: var(--radius-card-lg);
  box-shadow: var(--shadow-card);
  padding: 14px 16px 16px;
}

.cw-body {
  margin-top: 14px;
}

/* Inhaltswechsel beim Linsen-Tap: dieselbe Segment-Transition wie in den Tabs
   (opacity + kleiner translateY, Ease aus dem Pool). mode="out-in". */
.lens-swap-enter-active {
  transition: opacity 220ms var(--ease-standard), transform 220ms var(--ease-standard);
}
.lens-swap-leave-active {
  transition: opacity 140ms var(--ease-in), transform 140ms var(--ease-in);
}
.lens-swap-enter-from { opacity: 0; transform: translateY(6px); }
.lens-swap-leave-to { opacity: 0; transform: translateY(-6px); }

.entry-gen {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
  padding: 4px 2px 2px;
}
.entry-gen__lead {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.5;
  color: var(--text-secondary);
}
/* Erzeugen-Knopf: dezent KI-getönt (Akzent der Fläche = Wir-Blau), aber ruhig
   — kein Vollgradient, das wäre für einen Leerzustand zu laut. */
.entry-gen__btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  border: none;
  border-radius: 999px;
  background: var(--accent);
  color: var(--on-accent);
  font-family: var(--font-body);
  font-size: 13.5px;
  font-weight: 800;
  cursor: pointer;
  transition: transform 0.12s ease, opacity 0.18s ease;
}
.entry-gen__btn:active { transform: scale(0.97); }
.entry-gen__btn:disabled { cursor: default; }
.entry-gen__btn.is-busy { opacity: 0.85; }
.entry-gen__spark { font-size: 15px; }
.entry-gen__spin {
  width: 15px;
  height: 15px;
  border-radius: 50%;
  border: 2.5px solid color-mix(in srgb, var(--on-accent) 40%, transparent);
  border-top-color: var(--on-accent);
  animation: aiSpin 0.8s linear infinite;
}

/* Linsen-Umschalter — drei gleich breite Pillen, INNEN im Widget-Kopf. */
.lenses {
  display: flex;
  gap: 6px;
}

.lens {
  position: relative;
  flex: 1;
  padding: 8px 0;
  border: none;
  border-radius: 999px;
  background: var(--surface-deep);
  color: var(--text-secondary);
  font-family: var(--font-body);
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
  transition: background 0.18s ease, color 0.18s ease;
}

.lens--on {
  background: var(--accent);
  color: var(--on-accent);
}

/* Punkt = für diese Linse liegt noch kein Bericht dieser Woche vor. */
.lens-dot {
  display: inline-block;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--ai-mark);
  margin-left: 5px;
  vertical-align: middle;
}
.lens--on .lens-dot {
  background: currentColor;
}
</style>

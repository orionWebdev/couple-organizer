<script setup lang="ts">
import { computed, ref } from 'vue'
import type { CoachAction, CoachLens, CoachMetric, CoachReport } from '@/services/ai'
import CoachReportCard from '@/components/ai/CoachReportCard.vue'

// Der Paar-Coach im Wir-Tab — die EINE Anzeige für alle drei Blickwinkel
// (Woche · Fairness · Geld). Seit dem KI-Hub ist diese Karte REIN ANZEIGEND:
// erzeugt werden die Berichte über den globalen KI-Button (Kacheln
// Wochenrückblick/Aufgaben/Budget → coachInsight). Liegt für eine Linse noch
// kein Bericht dieser Woche vor, steht hier ein Hinweis auf den KI-Button.
//
// Pro Woche und Linse genau ein Bericht, für beide.
const props = defineProps<{
  // Bericht + Kennzahlen + Ersteller je Linse (aus useCoachRun).
  reportFor: (lens: CoachLens) => CoachReport | null
  metricsFor: (lens: CoachLens) => CoachMetric[]
  createdByNameFor: (lens: CoachLens) => string | null
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

// Kachel-Name im KI-Hub je Linse — für den Hinweistext.
const HUB_TILE: Record<CoachLens, string> = {
  week: 'Wochenrückblick',
  fairness: 'Aufgaben',
  money: 'Budget-Blick',
}
const entryHint = computed(() => HUB_TILE[activeLens.value])

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

          <!-- Noch kein Bericht dieser Linse — Verweis auf den KI-Button. -->
          <div v-else-if="showEntry" :key="'entry-' + activeLens" class="entry-hint">
            <span class="entry-hint__spark" aria-hidden="true">✨</span>
            <p>
              Noch kein Bericht dieser Woche. Tippe den <b>KI-Button</b> und wähle
              <b>„{{ entryHint }}"</b>.
            </p>
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

.entry-hint {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 4px 2px;
}
.entry-hint__spark {
  font-size: 20px;
  flex: none;
}
.entry-hint p {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.5;
  color: var(--text-secondary);
}
.entry-hint b { color: var(--text); font-weight: 800; }

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

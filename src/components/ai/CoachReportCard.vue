<script setup lang="ts">
import { computed } from 'vue'
import type { CoachAction, CoachMetric, CoachReport } from '@/services/ai'

// Die Ausgabe des Paar-Coachs im Wir-Tab (ein Bericht, drei Linsen).
//
// Seit dem 3er-Umbau: die WORTE (headline · talkingPoint · suggestion) kommen
// von der KI, die ZAHLEN als Slider (`metrics`) aus dem Snapshot — die frühere
// Prosa-`sections[]` ist ersatzlos weg. Trennung „Zahlen aus dem Code, Worte
// aus der KI" damit auch optisch sichtbar.
//
// Der Aktionsbutton ist der Punkt der ganzen Übung — er verwandelt Text in
// einen Tap. Die Komponente führt die Aktion nicht selbst aus, sie meldet sie
// nach oben; die Ziele existieren alle schon anderswo in der App.
const props = withDefaults(defineProps<{
  report: CoachReport
  metrics?: CoachMetric[]
  /** Eingebettet in eine umgebende Karte (CoachCard-Widget) — dann trägt diese
   *  die Karten-Hülle; hier fallen bg/border/shadow/padding weg. */
  embedded?: boolean
}>(), { metrics: () => [], embedded: false })

defineEmits<{ action: [action: CoachAction] }>()

const ACTION_LABELS: Record<CoachAction, string> = {
  rebalanceChores: 'Aufgaben neu verteilen',
  settleUp: 'Saldo begleichen',
  planIdea: 'Etwas gemeinsam planen',
  setBudget: 'Budget festlegen',
  none: '',
}

const actionLabel = computed(() => ACTION_LABELS[props.report.suggestion?.action ?? 'none'] || null)
</script>

<template>
  <div class="cr" :class="{ 'cr--embedded': embedded }">
    <p class="cr-headline">{{ report.headline }}</p>

    <!-- Kennzahlen als Slider — aus dem Snapshot, nicht aus der KI. -->
    <div v-if="metrics.length" class="cr-metrics">
      <div
        v-for="m in metrics"
        :key="m.key"
        class="cr-metric"
        :class="`cr-metric--${m.tone}`"
      >
        <div class="cr-metric-top">
          <span class="cr-metric-label">{{ m.label }}</span>
          <span class="cr-metric-value">{{ m.value }}</span>
        </div>
        <div class="cr-slider">
          <span class="cr-slider-fill" :style="{ width: `${m.pct}%` }" />
          <span class="cr-slider-thumb" :style="{ left: `${m.pct}%` }" />
        </div>
        <div class="cr-slider-ends">
          <span>{{ m.leftEnd }}</span>
          <span>{{ m.rightEnd }}</span>
        </div>
      </div>
    </div>

    <!-- Gegenseitiger Stütz-Vorschlag: eine Geste füreinander, aus dem was
         diese Woche schwer wog — präsent, warm, immer „ihr". -->
    <div v-if="report.supportHint" class="cr-support">
      <span class="cr-support-ico" aria-hidden="true">💛</span>
      <div>
        <span class="cr-support-lab">Für euch diese Woche</span>
        <p class="cr-support-text">{{ report.supportHint }}</p>
      </div>
    </div>

    <p v-if="report.talkingPoint" class="cr-talk">
      <span class="cr-talk-lab">Sagt euch das mal</span>
      „{{ report.talkingPoint }}"
    </p>

    <button
      v-if="actionLabel"
      type="button"
      class="btn-primary cr-action"
      @click="$emit('action', report.suggestion.action)"
    >
      {{ actionLabel }}
    </button>
    <p v-if="report.suggestion?.text && actionLabel" class="cr-action-hint">{{ report.suggestion.text }}</p>
  </div>
</template>

<style scoped>
.cr {
  background: var(--surface);
  border: 1px solid var(--border-softer);
  border-radius: var(--radius-card-lg);
  box-shadow: var(--shadow-card);
  padding: 18px;
}

/* Eingebettet ins Coach-Widget: die umgebende Karte trägt die Hülle. */
.cr--embedded {
  background: none;
  border: none;
  border-radius: 0;
  box-shadow: none;
  padding: 0;
}

.cr-headline {
  margin: 0 0 14px;
  font-family: var(--font-headline);
  font-size: 16.5px;
  font-weight: 700;
  color: var(--text);
  line-height: 1.4;
}

.cr-metrics {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.cr-metric-top {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 9px;
}

.cr-metric-label {
  font-size: 13px;
  font-weight: 800;
  color: var(--text);
}

.cr-metric-value {
  font-size: 12px;
  font-weight: 700;
  color: var(--text-secondary);
  text-align: right;
}

/* Slider: eine gefüllte Spur + ein Thumb an der Position. Der Ton färbt nur den
   Thumb/die Füllung dezent — nie die ganze Karte, das wäre der anklagende
   Eindruck, den der Coach vermeiden soll. --m-tone wird pro tone gesetzt. */
.cr-slider {
  position: relative;
  height: 7px;
  border-radius: 4px;
  background: var(--surface-deep);
}
.cr-slider-fill {
  position: absolute;
  inset: 0 auto 0 0;
  border-radius: 4px;
  background: var(--m-tone);
  opacity: 0.28;
}
.cr-slider-thumb {
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 15px;
  height: 15px;
  border-radius: 50%;
  background: var(--m-tone);
  border: 3px solid var(--surface);
  box-shadow: var(--shadow-card);
}
.cr-slider-ends {
  display: flex;
  justify-content: space-between;
  margin-top: 7px;
  font-size: 10px;
  font-weight: 700;
  color: var(--text-meta);
}

.cr-metric--good { --m-tone: var(--success); }
.cr-metric--watch { --m-tone: var(--accent); }
.cr-metric--act { --m-tone: var(--danger); }

/* Stütz-Vorschlag: warm, präsent, mit 💛 — eine Geste, kein App-Tap. Bewusst
   getönt (nicht akzent-gefüllt wie der Aktionsbutton), damit es einladend
   statt fordernd wirkt. */
.cr-support {
  display: flex;
  align-items: flex-start;
  gap: 11px;
  margin: 16px 0 0;
  padding: 13px 14px;
  border-radius: 14px;
  background: var(--planung-tint);
  border: 1px solid color-mix(in srgb, var(--planung) 20%, transparent);
}
.cr-support-ico { font-size: 19px; line-height: 1.2; flex: none; }
.cr-support-lab {
  display: block;
  font-size: 10.5px;
  font-weight: 800;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  color: var(--planung);
  margin-bottom: 3px;
}
.cr-support-text {
  margin: 0;
  font-size: 13.5px;
  font-weight: 600;
  line-height: 1.5;
  color: var(--text);
}

.cr-talk {
  margin: 14px 0 0;
  padding: 12px 14px;
  border-radius: 14px;
  background: var(--accent-tint);
  font-size: 13.5px;
  font-style: italic;
  color: var(--text);
  line-height: 1.5;
}

.cr-talk-lab {
  display: block;
  font-style: normal;
  font-size: 10.5px;
  font-weight: 800;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  color: var(--accent);
  margin-bottom: 4px;
}

.cr-action {
  margin-top: 16px;
}

.cr-action-hint {
  margin: 8px 0 0;
  font-size: 12px;
  color: var(--text-meta);
  text-align: center;
  line-height: 1.45;
}
</style>

<script setup lang="ts">
import { computed } from 'vue'
import type { CoachAction, CoachReport } from '@/services/ai'

// Die Ausgabe des Paar-Coachs. Bewusst eine eigene Komponente: der Finanz-Tab
// und (ab Stufe 3) das Wochen-Check-in auf dem Dashboard zeigen dasselbe.
//
// Der Aktionsbutton ist der Punkt der ganzen Übung — er verwandelt Text in
// einen Tap. Die Komponente führt die Aktion nicht selbst aus, sie meldet sie
// nach oben; die Ziele existieren alle schon anderswo in der App.
const props = defineProps<{ report: CoachReport }>()

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
  <div class="cr">
    <p class="cr-headline">{{ report.headline }}</p>

    <div v-if="report.sections?.length" class="cr-sections">
      <div
        v-for="(s, i) in report.sections"
        :key="i"
        class="cr-section"
        :class="`cr-section--${s.tone}`"
      >
        <span class="cr-section-title">{{ s.title }}</span>
        <p class="cr-section-text">{{ s.text }}</p>
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

.cr-headline {
  margin: 0 0 14px;
  font-family: var(--font-headline);
  font-size: 16.5px;
  font-weight: 700;
  color: var(--text);
  line-height: 1.4;
}

.cr-sections {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* Der Ton kommt als Feld aus der Antwort und färbt nur die Kante — nicht die
   Fläche: eine rot geflutete Karte über die Aufgabenverteilung wäre genau der
   anklagende Eindruck, den der Coach vermeiden soll. */
.cr-section {
  border-left: 3px solid var(--border-softer);
  padding: 2px 0 2px 12px;
}

.cr-section--good {
  border-left-color: var(--success);
}

.cr-section--watch {
  border-left-color: var(--accent);
}

.cr-section--act {
  border-left-color: var(--danger);
}

.cr-section-title {
  display: block;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  color: var(--text-meta);
  margin-bottom: 3px;
}

.cr-section-text {
  margin: 0;
  font-size: 13.5px;
  color: var(--text);
  line-height: 1.55;
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

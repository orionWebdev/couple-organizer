<script setup lang="ts">
import { computed } from 'vue'
import type { CoachAction, CoachReport } from '@/services/ai'
import AiButton from '@/components/ai/AiButton.vue'
import CoachReportCard from '@/components/ai/CoachReportCard.vue'

// Das Wochen-Check-in auf dem Dashboard — das Ritual, um das die ganze
// Coach-Schicht gebaut ist.
//
// Zwei Zustände: liegt der Bericht dieser Woche vor, steht er hier; sonst der
// KI-Einstieg, der ihn erzeugt. Der Bericht gehört dem Paar (siehe useCoach),
// beide sehen also denselben — auch wenn nur einer getippt hat.
const props = defineProps<{
  report: CoachReport | null
  thinking: boolean
  /** Solange die Berichte laden, ist "kein Bericht" noch keine Aussage. */
  loading?: boolean
  /** Wer hat das Check-in erzeugt — nur relevant, wenn es der Partner war. */
  createdByName?: string | null
}>()

defineEmits<{ generate: []; cancel: []; action: [action: CoachAction] }>()

const hasReport = computed(() => !!props.report)

// Während die Berichte noch laden, wäre der KI-Einstieg eine Falschaussage
// ("noch kein Check-in") — er würde bei jedem Dashboard-Aufruf kurz aufblitzen,
// obwohl der Bericht der Woche gleich eintrifft.
const showEntry = computed(() => !props.report && !props.loading)
</script>

<template>
  <div v-if="report || showEntry" class="ck">
    <div class="sec">
      <span class="sec-lab">Euer Wochen-Check-in</span>
      <span v-if="hasReport && createdByName" class="sec-by">von {{ createdByName }}</span>
    </div>

    <CoachReportCard
      v-if="report"
      :report="report"
      @action="$emit('action', $event)"
    />

    <AiButton
      v-else-if="showEntry"
      title="Wochen-Check-in"
      subtitle="Wie lief eure Woche zu zweit?"
      icon="🪞"
      :thinking="thinking"
      thinkingStatus="Schaut sich eure Woche an …"
      @click="thinking ? $emit('cancel') : $emit('generate')"
    />
  </div>
</template>

<style scoped>
.ck {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* Abschnittskopf wie im übrigen Dashboard (.sec in DashboardView). */
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
</style>

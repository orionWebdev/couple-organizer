<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Chore, ChoreHistoryEntry, Couple } from '@/types'
import { useAuth } from '@/composables/useAuth'
import { useCoach } from '@/composables/useCoach'
import { useAiThinking } from '@/composables/useAiThinking'
import { showPaywall } from '@/composables/usePaywall'
import { showToast } from '@/composables/useToast'
import { buildFairnessSnapshot, partnersOf } from '@/utils/coachSnapshot'
import { personVisual } from '@/utils/chores'
import AiButton from '@/components/ai/AiButton.vue'
import CoachReportCard from '@/components/ai/CoachReportCard.vue'
import type { CoachAction } from '@/services/ai'

// Die Fairness-Fläche: der wichtigste Hebel einer Paar-App, deshalb dauerhaft
// sichtbar statt hinter einem KI-Aufruf versteckt.
//
// Aufteilung nach dem Prinzip der ganzen Coach-Schicht: die ZAHLEN rechnet der
// Code (buildFairnessSnapshot → recentPoints, gratis und sofort), die KI liefert
// nur die WORTE — und zwar erst auf Tap, weil das Tageskontingent knapp ist.
// Ein Fairness-Gespräch ist nichts Tägliches.
const props = defineProps<{
  chores: readonly Chore[]
  history: readonly ChoreHistoryEntry[]
  couple: Couple | null
}>()

const emit = defineEmits<{ rebalance: [] }>()

const { user } = useAuth()
const coupleId = computed(() => user.value?.coupleId ?? null)
const { currentFairnessReport, generateReport } = useCoach(coupleId)
const { runTask, playBloom } = useAiThinking()

const thinking = ref(false)

// mentalLoad fehlt hier absichtlich: die Fairness-Lens bewertet nur die
// Ausführung; Coach-Regel 1 („was nicht im Snapshot steht, nicht behaupten")
// verhindert, dass die KI trotzdem darüber spricht.
const snapshot = computed(() =>
  buildFairnessSnapshot({ couple: props.couple, chores: props.chores, history: props.history })
)

// Die Balken-Segmente je Partner, in Personenfarben.
const shares = computed(() =>
  snapshot.value.load.map((row, i) => {
    const uid = props.couple?.memberIds[i]
    return {
      ...row,
      color: uid ? personVisual(uid, props.couple).color : 'var(--border-softer)',
    }
  })
)

const totalPoints = computed(() => snapshot.value.load.reduce((s, r) => s + r.points, 0))

// Ohne Erledigungen im Fenster gibt es nichts zu deuten — dann bleibt die Karte
// stumm, statt eine 50/50-Waage zu behaupten, die keine Grundlage hat.
const hasData = computed(() => totalPoints.value > 0)

// Ab wann ist es "schief"? Bewusst großzügig: unter 65 % ist Alltag, kein Thema.
const isSkewed = computed(() => shares.value.some((s) => s.sharePct >= 65))

const report = computed(() => currentFairnessReport.value?.report ?? null)

let runToken = 0
function cancel() {
  runToken++
  thinking.value = false
}

async function start() {
  if (thinking.value || !props.couple) return
  const token = ++runToken
  thinking.value = true

  const outcome = await runTask(() =>
    generateReport('fairness', {
      weekLabel: `letzte ${snapshot.value.windowDays} Tage`,
      partners: partnersOf(props.couple).map((p) => p.name),
      fairness: snapshot.value,
    })
  )

  if (token !== runToken) return
  if (outcome?.kind === 'ok') await playBloom()
  if (token !== runToken) return
  thinking.value = false

  if (outcome?.kind === 'paywall') showPaywall('coach')
  else if (outcome?.kind === 'error') showToast(outcome.message)
  else if (!outcome) showToast('Auswertung konnte nicht erstellt werden')
}

// Der Coach schreibt nichts selbst — 'rebalanceChores' landet im vorhandenen
// FairDistributeSheet, das der Haushalt-Tab ohnehin besitzt.
function onAction(action: CoachAction) {
  if (action === 'rebalanceChores') emit('rebalance')
}
</script>

<template>
  <div v-if="hasData" class="fair">
    <div class="fair-head">
      <span class="section-label">Wer trägt gerade mehr?</span>
      <span class="fair-window">letzte {{ snapshot.windowDays }} Tage</span>
    </div>

    <!-- Waage: reine Rechnung, immer sichtbar, kostet nichts -->
    <div class="fair-bar">
      <div
        v-for="s in shares"
        :key="s.name"
        class="fair-seg"
        :style="{ width: s.sharePct + '%', background: s.color }"
      />
    </div>
    <div class="fair-legend">
      <span v-for="s in shares" :key="s.name" class="fair-leg">
        <i class="fair-dot" :style="{ background: s.color }" />
        {{ s.name }} · <b>{{ s.sharePct }} %</b>
        <span class="fair-pts">{{ s.points }} Pkt</span>
      </span>
    </div>

    <p v-if="!isSkewed" class="fair-note fair-note--ok">
      Das liegt gut beieinander — {{ snapshot.completions }} Erledigungen in dieser Zeit.
    </p>
    <p v-else class="fair-note">
      {{ snapshot.completions }} Erledigungen, ungleich verteilt.
    </p>

    <!-- Wo die Last liegt -->
    <div v-if="snapshot.topRooms.length" class="fair-rooms">
      <div v-for="r in snapshot.topRooms" :key="r.room" class="fair-room">
        <span class="fair-room-name">{{ r.room }}</span>
        <span class="fair-room-vals">
          <span v-for="(p, i) in r.byPartner" :key="p.name">
            <template v-if="i > 0"> · </template>{{ p.name }} {{ p.points }}
          </span>
        </span>
      </div>
    </div>

    <p v-if="snapshot.unassignedChores > 0" class="fair-note">
      {{ snapshot.unassignedChores }} Aufgaben sind niemandem zugewiesen.
    </p>

    <!-- Die KI kommt erst hier ins Spiel: für die Worte, nicht die Zahlen -->
    <CoachReportCard v-if="report" :report="report" class="fair-report" @action="onAction" />
    <AiButton
      v-else
      class="fair-ai"
      icon="💬"
      title="Wie sprechen wir das an?"
      subtitle="Ein Satz, mit dem ihr anfangen könnt"
      :thinking="thinking"
      thinkingStatus="Sucht die richtigen Worte …"
      @click="thinking ? cancel() : start()"
    />
  </div>
</template>

<style scoped>
.fair {
  background: var(--surface);
  border: 1px solid var(--border-softer);
  border-radius: var(--radius-card-lg);
  box-shadow: var(--shadow-card);
  padding: 16px 18px 18px;
  margin-bottom: 14px;
}

.fair-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 12px;
}

.section-label {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.6px;
  text-transform: uppercase;
  color: var(--text-meta);
}

.fair-window {
  font-size: 11.5px;
  font-weight: 700;
  color: var(--text-faint);
}

/* Waage */
.fair-bar {
  display: flex;
  height: 14px;
  border-radius: 8px;
  overflow: hidden;
  background: var(--surface-deep);
}

.fair-seg {
  transition: width 0.4s var(--ease-standard, ease);
}

.fair-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  margin-top: 9px;
}

.fair-leg {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12.5px;
  color: var(--text-secondary);
}

.fair-leg b {
  color: var(--text);
}

.fair-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  flex: none;
}

.fair-pts {
  color: var(--text-faint);
  font-size: 11.5px;
}

.fair-note {
  margin: 10px 0 0;
  font-size: 12.5px;
  color: var(--text-meta);
  line-height: 1.5;
}

.fair-note--ok {
  color: var(--text-secondary);
}

/* Last je Bereich */
.fair-rooms {
  display: flex;
  flex-direction: column;
  gap: 5px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--border-softer);
}

.fair-room {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
  font-size: 12.5px;
}

.fair-room-name {
  font-weight: 700;
  color: var(--text);
}

.fair-room-vals {
  color: var(--text-meta);
  text-align: right;
}

.fair-ai,
.fair-report {
  margin-top: 14px;
}
</style>

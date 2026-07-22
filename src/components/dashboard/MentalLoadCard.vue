<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Couple } from '@/types'
import type { MentalLoadSummary } from '@/utils/mentalLoad'
import { partnerHighlights } from '@/utils/mentalLoad'
import { personVisual } from '@/utils/chores'
import { useCouple } from '@/composables/useCouple'
import { showToast } from '@/composables/useToast'

// „Wer denkt mit?" — die unsichtbare Hälfte der Arbeit.
//
// Zwei Blickrichtungen auf dieselben Zahlen, und die Reihenfolge ist Absicht:
// zuerst das, was der PARTNER getragen hat (Wertschätzung), danach erst die
// Waage (Ausgleich). Andersherum liest sich die Karte als Abrechnung — und
// „du machst zu wenig" ist das Gegenteil davon, eine Beziehung atmen zu lassen.
const props = defineProps<{
  summary: MentalLoadSummary
  couple: Couple | null
  currentUserId: string
}>()

const partnerUid = computed(
  () => props.couple?.memberIds.find((id) => id !== props.currentUserId) ?? null
)

const partnerName = computed(() =>
  partnerUid.value ? props.couple?.memberNames[partnerUid.value] ?? 'Dein Partner' : null
)

const highlights = computed(() =>
  partnerUid.value ? partnerHighlights(props.summary, partnerUid.value) : []
)

const shares = computed(() =>
  props.summary.people.map((p) => ({
    ...p,
    color: personVisual(p.uid, props.couple).color,
    isMe: p.uid === props.currentUserId,
  }))
)

// Erst ab einer spürbaren Schieflage überhaupt thematisieren. Bei 55/45 eine
// Ungerechtigkeit zu behaupten, erzeugt den Konflikt, den die App verhindern soll.
const skewed = computed(() => shares.value.some((s) => s.sharePct >= 65))

const myShare = computed(() => shares.value.find((s) => s.isMe) ?? null)

// ── Danke sagen ──────────────────────────────────────────────
// Der Knopf steht bewusst direkt unter dem, was der Partner getragen hat: Das
// ist der Moment, in dem man es liest — und die einzige Stelle, an der ein
// „Danke" nicht wie eine Aufforderung wirkt.
const { sayThanks } = useCouple()
const sending = ref(false)
const justSent = ref(false)

const THANKS_FRESH_DAYS = 7

function daysAgo(value: unknown): number | null {
  const ms = (value as { toMillis?: () => number } | undefined)?.toMillis?.()
  if (!ms) return null
  return Math.floor((Date.now() - ms) / 86400000)
}

// Habe ICH kürzlich gedankt? Dann kein zweiter Knopf — sonst wird aus einer
// Geste eine Aufgabe.
const myThanksAge = computed(() =>
  daysAgo(props.couple?.thanks?.[props.currentUserId])
)
const canThank = computed(
  () => !!partnerUid.value && (myThanksAge.value === null || myThanksAge.value >= THANKS_FRESH_DAYS)
)

// Hat der Partner mir gedankt? Das ist die Belohnung, nicht die Statistik.
const thanksReceived = computed(() => {
  if (!partnerUid.value) return null
  const age = daysAgo(props.couple?.thanks?.[partnerUid.value])
  return age !== null && age < THANKS_FRESH_DAYS ? age : null
})

const thanksReceivedLabel = computed(() => {
  const age = thanksReceived.value
  if (age === null) return null
  const when = age === 0 ? 'heute' : age === 1 ? 'gestern' : `vor ${age} Tagen`
  return `${partnerName.value} hat sich ${when} bei dir bedankt`
})

async function thank() {
  if (sending.value || !canThank.value) return
  sending.value = true
  const ok = await sayThanks()
  sending.value = false
  if (!ok) {
    showToast('Konnte nicht gesendet werden')
    return
  }
  justSent.value = true
  showToast(`${partnerName.value} bekommt dein Danke zu sehen`)
}
</script>

<template>
  <div v-if="summary.hasData" class="ml">
    <!-- Was zurückkommt, steht ganz oben — es ist das Wichtigere auf dieser Karte. -->
    <p v-if="thanksReceivedLabel" class="ml-received">
      <span aria-hidden="true">💛</span> {{ thanksReceivedLabel }}
    </p>

    <!-- Wertschätzung zuerst -->
    <template v-if="highlights.length && partnerName">
      <div class="ml-head">
        <span class="ml-lab">Das hat {{ partnerName }} mitgedacht</span>
        <span class="ml-window">{{ summary.windowDays }} Tage</span>
      </div>
      <ul class="ml-list">
        <li v-for="h in highlights" :key="h.key" class="ml-item">
          <span class="ml-check" aria-hidden="true">✓</span>
          <span>{{ h.text }}</span>
        </li>
      </ul>

      <button
        v-if="canThank && !justSent"
        type="button"
        class="ml-thank"
        :disabled="sending"
        @click="thank"
      >
        <span aria-hidden="true">💛</span> Danke sagen
      </button>
      <p v-else-if="justSent" class="ml-thanked">
        Gesendet — {{ partnerName }} sieht das beim nächsten Öffnen.
      </p>
    </template>

    <!-- Waage danach, und bewusst schmal -->
    <div class="ml-balance">
      <div class="ml-bar">
        <div
          v-for="s in shares"
          :key="s.uid"
          class="ml-seg"
          :style="{ width: s.sharePct + '%', background: s.color }"
        />
      </div>
      <div class="ml-legend">
        <span v-for="s in shares" :key="s.uid" class="ml-leg">
          <i class="ml-dot" :style="{ background: s.color }" />
          {{ s.isMe ? 'Du' : s.name }} <b>{{ s.sharePct }} %</b>
        </span>
      </div>
    </div>

    <p v-if="skewed && myShare && myShare.sharePct < 40" class="ml-note">
      {{ partnerName }} hält gerade den größeren Teil im Kopf — das sieht man sonst nirgends.
    </p>
    <p v-else-if="skewed && myShare && myShare.sharePct >= 65" class="ml-note">
      Du hältst gerade den größeren Teil im Kopf.
    </p>
  </div>
</template>

<style scoped>
.ml {
  background: var(--surface);
  border: 1px solid var(--border-softer);
  border-radius: var(--radius-card-lg);
  box-shadow: var(--shadow-card);
  padding: 16px 18px 18px;
}

.ml-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 10px;
}

.ml-lab {
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  color: var(--text-meta);
}

.ml-window {
  font-size: 11.5px;
  font-weight: 700;
  color: var(--text-faint);
  flex: none;
}

.ml-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.ml-item {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  font-size: 13.5px;
  color: var(--text);
  line-height: 1.45;
}

.ml-check {
  flex: none;
  width: 18px;
  height: 18px;
  margin-top: 1px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 10px;
  font-weight: 800;
  color: #fff;
  background: var(--success);
}

/* Danke: warm, aber kein Gradient und kein Glühen — das ist eine Geste
   zwischen zwei Menschen, keine Funktion der App. */
.ml-thank {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  margin-top: 13px;
  padding: 9px 16px;
  border: 1.5px solid var(--border-softer);
  border-radius: 999px;
  background: var(--surface-deep);
  font-family: var(--font-body);
  font-size: 13px;
  font-weight: 700;
  color: var(--text);
  cursor: pointer;
  transition: transform 0.12s ease;
}

.ml-thank:active {
  transform: scale(0.96);
}

.ml-thank:disabled {
  opacity: 0.5;
  pointer-events: none;
}

.ml-thanked,
.ml-received {
  display: flex;
  align-items: center;
  gap: 7px;
  margin: 13px 0 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
  line-height: 1.45;
}

.ml-received {
  margin: 0 0 14px;
  padding: 10px 12px;
  border-radius: 12px;
  background: var(--accent-tint);
  color: var(--text);
}

/* Die Waage ist absichtlich das leisere Element: schmaler Balken, kleine
   Schrift. Sie ordnet ein, sie klagt nicht an. */
.ml-balance {
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px solid var(--border-softer);
}

.ml-bar {
  display: flex;
  height: 8px;
  border-radius: 6px;
  overflow: hidden;
  background: var(--surface-deep);
}

.ml-seg {
  transition: width 0.4s var(--ease-standard, ease);
}

.ml-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  margin-top: 8px;
}

.ml-leg {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  color: var(--text-secondary);
}

.ml-leg b {
  color: var(--text);
}

.ml-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex: none;
}

.ml-note {
  margin: 10px 0 0;
  font-size: 12.5px;
  color: var(--text-meta);
  line-height: 1.5;
}
</style>

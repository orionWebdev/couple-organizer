<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Couple } from '@/types'
import type { MentalLoadSummary } from '@/utils/mentalLoad'
import { partnerHighlights } from '@/utils/mentalLoad'
import { useCouple } from '@/composables/useCouple'
import { showToast } from '@/composables/useToast'

// „Wer denkt mit?" — die unsichtbare Hälfte der Arbeit, neu gedacht.
//
// Früher trug diese Karte eine zweite Waage (Prozent-Balken, wer trägt mehr).
// Genau das fühlte sich wertend an und führte zu nichts. Die Waage ist raus;
// geblieben ist der wertvolle Teil: das Unsichtbare SICHTBAR machen — konkret
// benennen, was der Partner diese Woche im Kopf behalten hat — und die einzige
// Geste, die daraus folgt: sich bedanken.
//
// Bewusst keine Zahlen über „wer mehr". Wertschätzung vor Bilanz, ohne das
// „vor" überhaupt noch aufzumachen.
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

// ── Danke sagen ──────────────────────────────────────────────
// Der Knopf steht direkt unter dem, was der Partner getragen hat: Das ist der
// Moment, in dem man es liest — und die einzige Stelle, an der ein „Danke"
// nicht wie eine Aufforderung wirkt.
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
const myThanksAge = computed(() => daysAgo(props.couple?.thanks?.[props.currentUserId]))
const canThank = computed(
  () => !!partnerUid.value && (myThanksAge.value === null || myThanksAge.value >= THANKS_FRESH_DAYS)
)

// Hat der Partner MIR gedankt? Das ist die Belohnung, nicht die Statistik.
const thanksReceivedLabel = computed(() => {
  if (!partnerUid.value) return null
  const age = daysAgo(props.couple?.thanks?.[partnerUid.value])
  if (age === null || age >= THANKS_FRESH_DAYS) return null
  const when = age === 0 ? 'heute' : age === 1 ? 'gestern' : `vor ${age} Tagen`
  return `${partnerName.value} hat sich ${when} bei dir bedankt`
})

// Nichts Warmes zu zeigen → gar keine Karte, statt einer hohlen Hülle.
const hasContent = computed(
  () => (highlights.value.length > 0 && !!partnerName.value) || !!thanksReceivedLabel.value
)

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
  <div v-if="hasContent" class="ml">
    <!-- Was zurückkommt, steht ganz oben — es ist das Wichtigere auf dieser Karte. -->
    <p v-if="thanksReceivedLabel" class="ml-received">
      <span aria-hidden="true">💛</span> {{ thanksReceivedLabel }}
    </p>

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
</style>

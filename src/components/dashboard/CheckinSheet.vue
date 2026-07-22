<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { CheckinArea, CheckinLevel } from '@/types'
import { CHECKIN_AREAS, CHECKIN_LEVEL_LABELS } from '@/utils/checkin'
import BottomSheet from '@/components/ui/BottomSheet.vue'

// Das Check-in-Sheet — Consent zuerst, Formular danach.
//
// Der Consent-Schritt ist kein UI-Schnörkel, sondern die DSGVO-Einwilligung
// (Gefühlsdaten, Art.-9-Nähe): er benennt konkret, was mit einem Eintrag
// passiert, BEVOR der erste geschrieben werden kann. Das Sheet schreibt selbst
// nichts — es meldet consent/submit nach oben (Hausmuster wie AddIdeaSheet).
const props = defineProps<{
  isOpen: boolean
  /** Einwilligung liegt vor → Formular statt Consent-Schritt. */
  optedIn: boolean
}>()

const emit = defineEmits<{
  close: []
  consent: []
  submit: [payload: { area: CheckinArea; level: CheckinLevel; text?: string }]
}>()

const area = ref<CheckinArea>('haushalt')
const level = ref<CheckinLevel>(1)
const text = ref('')
const MAX_TEXT = 500

// Jedes Öffnen startet frisch — ein Check-in ist eine Momentaufnahme, kein
// Entwurf, der tagelang liegen bleibt.
watch(() => props.isOpen, (open) => {
  if (!open) return
  area.value = 'haushalt'
  level.value = 1
  text.value = ''
})

const levels = computed(() =>
  ([1, 2, 3] as CheckinLevel[]).map((l) => ({ value: l, label: CHECKIN_LEVEL_LABELS[l] }))
)

function submit() {
  emit('submit', {
    area: area.value,
    level: level.value,
    text: text.value.trim() || undefined
  })
}
</script>

<template>
  <BottomSheet :isOpen="isOpen" :title="optedIn ? 'Wie geht’s dir gerade?' : 'Dein Check-in'" @close="emit('close')">
    <div class="area-dashboard">
      <!-- Schritt 1: Einwilligung -->
      <div v-if="!optedIn" class="ci-consent">
        <p class="ci-intro">
          Hier kannst du der App anvertrauen, was dich in eurem Alltag gerade
          beschäftigt — Dinge, die man nicht immer sofort ausspricht.
        </p>
        <ul class="ci-facts">
          <li><b>Privat.</b> Deine Einträge siehst nur du — niemals dein Partner, weder jetzt noch später.</li>
          <li><b>Anonym im Wochenbericht.</b> Der Paar-Coach kann ein Thema aufgreifen — ohne Namen, ohne Zitat, ohne Schuldzuweisung („einer von euch …").</li>
          <li><b>Kein Archiv.</b> Einträge verschwinden nach 8 Wochen von selbst; löschen kannst du sie jederzeit sofort.</li>
          <li><b>Verarbeitung.</b> Für den Wochenbericht werden nur grobe Themen (z. B. „Haushalt, beschäftigt öfter") an Google Gemini übermittelt — nie dein Wortlaut.</li>
        </ul>
        <button type="button" class="btn-primary" @click="emit('consent')">
          Einverstanden — Check-in aktivieren
        </button>
        <button type="button" class="ci-later" @click="emit('close')">Nicht jetzt</button>
      </div>

      <!-- Schritt 2: der eigentliche Check-in -->
      <div v-else class="ci-form">
        <span class="ci-lab">Worum geht es?</span>
        <div class="ci-areas">
          <button
            v-for="a in CHECKIN_AREAS"
            :key="a.id"
            type="button"
            class="ci-chip"
            :class="{ 'ci-chip--on': area === a.id }"
            @click="area = a.id"
          >
            <span aria-hidden="true">{{ a.emoji }}</span> {{ a.label }}
          </button>
        </div>

        <span class="ci-lab">Wie sehr?</span>
        <div class="ci-levels">
          <button
            v-for="l in levels"
            :key="l.value"
            type="button"
            class="ci-level"
            :class="{ 'ci-level--on': level === l.value }"
            @click="level = l.value"
          >
            {{ l.label }}
          </button>
        </div>

        <span class="ci-lab">Magst du es in Worte fassen? <i class="ci-opt">optional</i></span>
        <textarea
          v-model="text"
          class="app-field ci-text"
          :maxlength="MAX_TEXT"
          rows="4"
          placeholder="Nur für dich — dein Partner liest das nie."
        />
        <span class="ci-count">{{ text.length }} / {{ MAX_TEXT }}</span>

        <button type="button" class="btn-primary" @click="submit">Speichern</button>
      </div>

      <!-- Krisen-Hinweis: steht IMMER da, unabhängig vom Inhalt — die KI
           reagiert bewusst nicht auf Krisen (CHECKIN_RULES 5), die App schon. -->
      <p class="ci-crisis">
        TwoDo ist kein Therapie-Ersatz. Wenn es dir ernsthaft nicht gut geht:
        Telefonseelsorge <a href="tel:08001110111">0800 111 0 111</a> — kostenlos, rund um die Uhr.
      </p>
    </div>
  </BottomSheet>
</template>

<style scoped>
.ci-intro {
  margin: 0 0 14px;
  font-size: 14px;
  color: var(--text);
  line-height: 1.55;
}

.ci-facts {
  list-style: none;
  margin: 0 0 18px;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.ci-facts li {
  padding-left: 14px;
  position: relative;
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.5;
}

.ci-facts li::before {
  content: '';
  position: absolute;
  left: 0;
  top: 7px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--accent);
}

.ci-facts b {
  color: var(--text);
}

.ci-later {
  display: block;
  width: 100%;
  margin-top: 10px;
  padding: 10px;
  border: none;
  background: none;
  font-family: var(--font-body);
  font-size: 13.5px;
  font-weight: 700;
  color: var(--text-meta);
  cursor: pointer;
}

.ci-form {
  display: flex;
  flex-direction: column;
}

.ci-lab {
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  color: var(--text-meta);
  margin: 14px 0 8px;
}

.ci-lab:first-child {
  margin-top: 0;
}

.ci-opt {
  font-style: normal;
  text-transform: none;
  letter-spacing: 0;
  font-weight: 600;
  color: var(--text-faint);
}

.ci-areas {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.ci-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 13px;
  border: 1.5px solid var(--border-softer);
  border-radius: 999px;
  background: var(--surface);
  font-family: var(--font-body);
  font-size: 13px;
  font-weight: 700;
  color: var(--text);
  cursor: pointer;
}

.ci-chip--on {
  border-color: var(--accent);
  background: var(--accent-tint);
}

.ci-levels {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.ci-level {
  padding: 10px 13px;
  border: 1.5px solid var(--border-softer);
  border-radius: 12px;
  background: var(--surface);
  font-family: var(--font-body);
  font-size: 13.5px;
  font-weight: 700;
  color: var(--text);
  text-align: left;
  cursor: pointer;
}

.ci-level--on {
  border-color: var(--accent);
  background: var(--accent-tint);
}

.ci-text {
  resize: none;
}

.ci-count {
  margin: 4px 2px 14px;
  font-size: 11.5px;
  font-weight: 600;
  color: var(--text-faint);
  text-align: right;
}

.ci-crisis {
  margin: 18px 0 0;
  padding-top: 12px;
  border-top: 1px solid var(--border-softer);
  font-size: 12px;
  color: var(--text-meta);
  line-height: 1.5;
}

.ci-crisis a {
  color: var(--accent);
  font-weight: 700;
  text-decoration: none;
}
</style>

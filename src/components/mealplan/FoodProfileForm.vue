<script setup lang="ts">
import { ref, watch } from 'vue'
import type { FoodProfile } from '@/types'

// Dumme Formular-Komponente für Couple.foodProfile. Zwei Aufrufer teilen sie
// sich: der 'profile'-Schritt im KitchenAiSheet (bearbeiten, wo es weh tut) und
// die Settings-Unterseite /settings/essprofil (finden, wenn man es sucht).
const props = defineProps<{
  profile: FoodProfile
  saving?: boolean
  saveLabel?: string
}>()

const emit = defineEmits<{ save: [profile: FoodProfile] }>()

const servings = ref(props.profile.servings)
const diet = ref(props.profile.diet)
const dislikes = ref(props.profile.dislikes)
const likes = ref(props.profile.likes)
const maxMinutes = ref<number | null>(props.profile.weekdayMaxMinutes)

// Neu befüllen, wenn das Profil von außen nachlädt (der Couple-Snapshot kommt
// asynchron — beim ersten Render steht oft noch der Default drin).
watch(
  () => props.profile,
  (p) => {
    servings.value = p.servings
    diet.value = p.diet
    dislikes.value = p.dislikes
    likes.value = p.likes
    maxMinutes.value = p.weekdayMaxMinutes
  }
)

const MINUTE_OPTIONS: { label: string; value: number | null }[] = [
  { label: 'egal', value: null },
  { label: '20 Min', value: 20 },
  { label: '30 Min', value: 30 },
  { label: '45 Min', value: 45 },
]

function submit() {
  emit('save', {
    servings: servings.value,
    diet: diet.value.trim(),
    dislikes: dislikes.value.trim(),
    likes: likes.value.trim(),
    weekdayMaxMinutes: maxMinutes.value,
  })
}
</script>

<template>
  <div class="fp">
    <p class="fp-intro">
      Gilt für jeden KI-Vorschlag — Einzelrezept wie Wochenplan. Einmal eintragen statt jedes Mal tippen.
    </p>

    <div class="fp-label">Standard-Portionen</div>
    <div class="fp-stepper">
      <button type="button" class="fp-step" :disabled="servings <= 1" @click="servings--">–</button>
      <span class="fp-step-val">{{ servings }}</span>
      <button type="button" class="fp-step" :disabled="servings >= 12" @click="servings++">+</button>
    </div>

    <div class="fp-label fp-label--mt">Ernährungsform</div>
    <input
      v-model="diet"
      class="app-field"
      type="text"
      placeholder="z. B. vegetarisch — leer lassen für alles"
    />

    <div class="fp-label fp-label--mt">Kommt gar nicht in Frage</div>
    <textarea
      v-model="dislikes"
      class="app-field fp-area"
      rows="2"
      placeholder="z. B. Fisch, Oliven, Koriander"
    />

    <div class="fp-label fp-label--mt">Mögt ihr besonders</div>
    <textarea
      v-model="likes"
      class="app-field fp-area"
      rows="2"
      placeholder="z. B. viel Gemüse, asiatisch, scharf"
    />

    <div class="fp-label fp-label--mt">Kochzeit werktags</div>
    <div class="fp-minutes">
      <button
        v-for="opt in MINUTE_OPTIONS"
        :key="String(opt.value)"
        type="button"
        class="fp-min"
        :class="{ 'fp-min--active': maxMinutes === opt.value }"
        @click="maxMinutes = opt.value"
      >
        {{ opt.label }}
      </button>
    </div>

    <button class="btn-primary fp-save" :disabled="saving" @click="submit">
      {{ saving ? 'Wird gespeichert …' : (saveLabel ?? 'Profil speichern') }}
    </button>
  </div>
</template>

<style scoped>
.fp-intro {
  margin: 0 0 16px;
  font-size: 12.5px;
  color: var(--text-secondary);
  line-height: 1.5;
}

.fp-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.6px;
  text-transform: uppercase;
  color: var(--text-meta);
  margin-bottom: 7px;
}

.fp-label--mt {
  margin-top: 16px;
}

.fp-stepper {
  display: flex;
  align-items: center;
  gap: 16px;
}

.fp-step {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  border: 1.5px solid var(--border-softer);
  background: var(--surface-deep);
  font-size: 20px;
  font-weight: 700;
  color: var(--text-secondary);
  cursor: pointer;
}

.fp-step:disabled {
  opacity: 0.4;
  pointer-events: none;
}

.fp-step-val {
  font-family: var(--font-headline);
  font-size: 18px;
  font-weight: 700;
  color: var(--text);
  min-width: 22px;
  text-align: center;
}

.fp-area {
  resize: none;
}

.fp-minutes {
  display: flex;
  gap: 6px;
}

.fp-min {
  flex: 1;
  padding: 9px 0;
  border: 1.5px solid var(--border-softer);
  border-radius: 10px;
  background: var(--surface-deep);
  font-family: var(--font-body);
  font-size: 12.5px;
  font-weight: 700;
  color: var(--text-meta);
  cursor: pointer;
}

.fp-min--active {
  border-color: var(--accent);
  background: var(--accent-tint);
  color: var(--text);
}

.fp-save {
  margin-top: 20px;
}
</style>

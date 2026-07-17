<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    height?: number
    variant?: 'mark' | 'horizontal' | 'vertical'
    word?: string
    tagline?: string
    colorA?: string
    colorB?: string
    blendMode?: 'multiply' | 'screen' | 'normal'
    splitAt?: number
  }>(),
  {
    height: 64,
    variant: 'horizontal',
    word: 'TwoDo',
    tagline: '',
    colorA: 'var(--haushalt)',
    colorB: 'var(--finanzen)',
    // Kein Default: ohne Angabe entscheidet --brand-blend und damit das Theme.
    blendMode: undefined,
    // „TwoDo" teilt sich nach „Two" (3 Zeichen): erste Silbe colorA, zweite colorB.
    splitAt: 3,
  }
)

const markWidth = computed(() => Math.round(props.height * (120 / 90)))
const showText = computed(() => props.variant !== 'mark' && !!props.word)
const wordSize = computed(() => Math.round(props.height * 0.62))
const tagSize = computed(() => Math.max(11, Math.round(props.height * 0.2)))
const wordHead = computed(() => props.word.slice(0, props.splitAt))
const wordTail = computed(() => props.word.slice(props.splitAt))
const gap = computed(() =>
  Math.round(props.height * (props.variant === 'vertical' ? 0.28 : 0.3))
)
// Ohne explizite Angabe folgt der Blend dem Theme: hell multiply, dunkel screen.
const blend = computed(() => props.blendMode ?? 'var(--brand-blend)')
</script>

<template>
  <div
    class="logo"
    :class="[`logo--${variant}`, { 'logo--mark-only': !showText }]"
    :style="{ gap: `${gap}px`, '--logo-blend': blend }"
  >
    <svg
      :width="markWidth"
      :height="height"
      viewBox="0 0 120 90"
      role="img"
      :aria-label="word ? `${word} Logo` : 'TwoDo Logo'"
    >
      <!-- Blend liegt auf den Kreisen, nicht auf der Gruppe: nur so hebt sich die
           Überschneidung ab („geteilter Raum"). isolation hält den Blend im Symbol. -->
      <g style="isolation: isolate">
        <circle class="logo-circle" cx="46" cy="45" r="33" :style="{ fill: colorA }" />
        <circle class="logo-circle" cx="74" cy="45" r="33" :style="{ fill: colorB }" />
      </g>
    </svg>

    <div v-if="showText" class="logo-text" :style="{ gap: `${Math.round(height * 0.06)}px` }">
      <span class="logo-word" :style="{ fontSize: `${wordSize}px` }">
        <span :style="{ color: colorA }">{{ wordHead }}</span><span :style="{ color: colorB }">{{ wordTail }}</span>
      </span>
      <span v-if="tagline" class="logo-tagline" :style="{ fontSize: `${tagSize}px` }">
        {{ tagline }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.logo {
  display: inline-flex;
  align-items: center;
}

/* Über --logo-blend statt inline, weil mix-blend-mode dort nur die Blend-Literale
   annimmt — kein var(). Der Wert kommt aus der blendMode-Prop oder dem Theme. */
.logo-circle {
  mix-blend-mode: var(--logo-blend);
}

.logo--horizontal {
  flex-direction: row;
  text-align: left;
}

.logo--vertical {
  flex-direction: column;
  text-align: center;
}

.logo-text {
  display: flex;
  flex-direction: column;
  line-height: 1;
}

.logo-word {
  font-family: var(--font-headline);
  font-weight: 600;
  letter-spacing: -0.5px;
}

.logo-tagline {
  font-family: var(--font-body);
  font-weight: 600;
  color: var(--text-secondary);
}
</style>

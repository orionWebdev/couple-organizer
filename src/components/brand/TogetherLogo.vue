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
    wordColor?: string
    blendMode?: 'multiply' | 'screen' | 'normal'
  }>(),
  {
    height: 64,
    variant: 'horizontal',
    word: 'Together',
    tagline: '',
    colorA: 'var(--haushalt)',
    colorB: 'var(--finanzen)',
    wordColor: 'var(--text)',
    blendMode: 'multiply',
  }
)

const markWidth = computed(() => Math.round(props.height * (120 / 90)))
const showText = computed(() => props.variant !== 'mark' && !!props.word)
const wordSize = computed(() => Math.round(props.height * 0.62))
const tagSize = computed(() => Math.max(11, Math.round(props.height * 0.2)))
const gap = computed(() =>
  Math.round(props.height * (props.variant === 'vertical' ? 0.28 : 0.3))
)
</script>

<template>
  <div
    class="logo"
    :class="[`logo--${variant}`, { 'logo--mark-only': !showText }]"
    :style="{ gap: `${gap}px` }"
  >
    <svg
      :width="markWidth"
      :height="height"
      viewBox="0 0 120 90"
      role="img"
      :aria-label="word ? `${word} Logo` : 'Together Logo'"
    >
      <!-- Blend liegt auf den Kreisen, nicht auf der Gruppe: nur so dunkelt die
           Überschneidung ein („geteilter Raum"). isolation hält den Blend im Symbol. -->
      <g style="isolation: isolate">
        <circle cx="46" cy="45" r="33" :style="{ fill: colorA, mixBlendMode: blendMode }" />
        <circle cx="74" cy="45" r="33" :style="{ fill: colorB, mixBlendMode: blendMode }" />
      </g>
    </svg>

    <div v-if="showText" class="logo-text" :style="{ gap: `${Math.round(height * 0.06)}px` }">
      <span class="logo-word" :style="{ fontSize: `${wordSize}px`, color: wordColor }">
        {{ word }}
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

<script setup lang="ts">
import AiMarkLoader from './AiMarkLoader.vue'

// Die Denk-Zeile, die im glühenden Sheet die Aktionszeilen ersetzt: Gradient-
// Icon-Kachel · Status/Untertitel · Mini-Loader (Akzent-Lila).
defineProps<{
  icon: string
  status: string
  subtitle?: string
}>()
</script>

<template>
  <div class="think-row" role="status" aria-live="polite">
    <span class="think-icon">{{ icon }}</span>
    <span class="think-text">
      <b>{{ status }}</b>
      <i v-if="subtitle">{{ subtitle }}</i>
    </span>
    <AiMarkLoader />
  </div>
</template>

<style scoped>
/* Läuft immer auf der glühenden Gradient-Sheet-Fläche → alles in Weiß. */
.think-row {
  display: flex;
  align-items: center;
  gap: 13px;
  padding: 12px 4px;
  /* Loader (AiMarkLoader liest --ai-mark) auf dem Gradient in Weiß. */
  --ai-mark: #fff;
}

.think-icon {
  flex: none;
  display: grid;
  place-items: center;
  width: 46px;
  height: 46px;
  border-radius: 14px;
  font-size: 22px;
  background: rgba(255, 255, 255, 0.25);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.4), 0 2px 8px rgba(0, 0, 0, 0.14);
}

.think-text {
  flex: 1;
  min-width: 0;
  text-shadow: var(--ai-textshadow);
}

.think-text b {
  display: block;
  font-family: var(--font-headline);
  font-weight: 600;
  font-size: 15.5px;
  color: #fff;
}

.think-text i {
  display: block;
  font-style: normal;
  font-size: 12.5px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.9);
  margin-top: 2px;
}
</style>
